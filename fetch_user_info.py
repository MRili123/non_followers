
import json
import os
import sys
import requests
import time
import argparse

parser = argparse.ArgumentParser()
parser.add_argument("--sessionid", required=True, help="Instagram sessionid cookie")
parser.add_argument("--csrftoken", required=True, help="Instagram csrftoken cookie")
parser.add_argument("--get-uid", action="store_true", help="Just return uid and username in JSON format")
parser.add_argument("identifier", nargs="?", default=None, help="Username or user ID")
args = parser.parse_args()

CACHE = ".ig_cache"
os.makedirs(CACHE, exist_ok=True)

def save_json(name, data):
    with open(os.path.join(CACHE, f"{name}.json"), "w", encoding="utf8") as f:
        json.dump(data, f, indent=2, ensure_ascii=False)

def get_page(url, params=None, retries=10):
    for attempt in range(retries):
        r = session.get(url, params=params or {}, timeout=30)
        if r.status_code == 200:
            return r.json()
        if r.status_code == 429:
            wait = min(60 * (attempt + 1), 300)
            print(f"  rate-limited (429) – waiting {wait}s before retry {attempt+1}/{retries}")
            time.sleep(wait)
            continue
        if r.status_code == 400 and "feedback_required" in r.text:
            wait = 60
            print(f"  feedback required – waiting {wait}s (attempt {attempt+1}/{retries})")
            time.sleep(wait)
            continue
        print("HTTP", r.status_code, r.text[:300])
        if attempt == retries - 1:
            sys.exit("Aborted")
    sys.exit("Too many rate-limit hits")

sessionid = args.sessionid
csrftoken = args.csrftoken

session = requests.Session()
session.cookies.set("sessionid", sessionid, domain=".instagram.com")
session.cookies.set("csrftoken", csrftoken, domain=".instagram.com")

HEADERS = {
    "User-Agent": "Instagram 261.0.0.13.109 Android (25/7.1.2; 320dpi; 900x1600; samsung; SM-G977N; beyond1q; qcom; en_US; 444110489)",
    "Accept": "*/*",
    "Accept-Language": "en-US,en;q=0.5",
    "X-IG-App-ID": "936619743392459",
}
session.headers.update(HEADERS)

def fetch_user_info(identifier):
    """
    Fetch user info using Instagram's mobile API.
    identifier can be a username (e.g., 'kittyhiba1') or numeric user ID.
    """
    # If numeric ID, use direct endpoint
    if identifier.isdigit():
        url = f"https://i.instagram.com/api/v1/users/{identifier}/info/"
        data = get_page(url)
        user = data.get("user", {})
    else:
        # Search by username using web profile info endpoint
        url = "https://i.instagram.com/api/v1/users/web_profile_info/"
        params = {"username": identifier}
        data = get_page(url, params)
        user = data.get("data", {}).get("user", {})
    
    if not user:
        sys.exit(f"Could not find user: {identifier}")
    
    # Normalize to mobile API format matching your example
    normalized = {
        "strong_id__": str(user.get("id") or user.get("pk") or user.get("pk_id") or ""),
        "fbid_v2": user.get("fbid_v2", ""),
        "pk": str(user.get("pk") or user.get("id") or user.get("pk_id") or ""),
        "pk_id": str(user.get("pk_id") or user.get("pk") or user.get("id") or ""),
        "id": str(user.get("id") or user.get("pk") or user.get("pk_id") or ""),
        "third_party_downloads_enabled": user.get("third_party_downloads_enabled", 1),
        "full_name": user.get("full_name", ""),
        "is_private": user.get("is_private", False),
        "is_verified": user.get("is_verified", False),
        "profile_pic_id": user.get("profile_pic_id", ""),
        "profile_pic_url": user.get("profile_pic_url", ""),
        "username": user.get("username", ""),
        "account_badges": user.get("account_badges", []),
        "has_anonymous_profile_picture": user.get("has_anonymous_profile_picture", False),
        "latest_reel_media": user.get("latest_reel_media", 0),
        "is_favorite": user.get("is_favorite", False),
    }
    
    # Copy any extra fields from original that we might have missed
    for key in ["third_party_downloads_enabled", "latest_reel_media", "is_favorite",
                "has_anonymous_profile_picture", "account_badges"]:
        if key in user:
            normalized[key] = user[key]
    
    return normalized

def add_to_non_followers(user_data):
    """Append user to non_followers.json if not already present"""
    path = os.path.join(CACHE, "non_followers.json")
    users = []
    if os.path.exists(path):
        with open(path, "r", encoding="utf8") as f:
            users = json.load(f)
    
    # Check for duplicates by pk
    if not any(str(u.get("pk")) == str(user_data["pk"]) for u in users):
        users.append(user_data)
        with open(path, "w", encoding="utf8") as f:
            json.dump(users, f, indent=2, ensure_ascii=False)
        print(f"\\n✓ Added {user_data['username']} to non_followers.json")
    else:
        print(f"\\n⚠ {user_data['username']} already exists in non_followers.json")

def main():
    if args.get_uid:
        user_data = fetch_current_user()
        print(json.dumps({"uid": user_data["pk"], "username": user_data["username"]}))
    elif args.identifier:
        identifier = args.identifier.strip()
        print(f"Fetching info for: {identifier}...")
        print("(Using gentle mode with automatic retry on rate limits)")
        time.sleep(5)
        user_data = fetch_user_info(identifier)
        print("\\n" + "="*60)
        print("USER INFO (mobile API format):")
        print("="*60)
        print(json.dumps(user_data, indent=2, ensure_ascii=False))
        print("="*60)
        save_json(f"user_{user_data['username']}", user_data)
        print(f"\\n✓ Saved to .ig_cache/user_{user_data['username']}.json")
        response = input("\\nAdd this user to non_followers.json? (y/n): ").strip().lower()
        if response == 'y':
            add_to_non_followers(user_data)
    else:
        print("Usage: python fetch_user_info.py <username_or_userid>")
        print("Example: python fetch_user_info.py kittyhiba1")
        print("Example: python fetch_user_info.py 47967732984")
        sys.exit(1)

def fetch_current_user():
    """Fetch current authenticated user info"""
    url = "https://i.instagram.com/api/v1/accounts/current_user/"
    data = get_page(url)
    return data.get("user", {})

if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        sys.exit("\\nAborted by user")

