#!/usr/bin/env python3
"""
insta_non_followers_gentle.py  –  slow / resumable fetch to avoid Instagram rate limits
"""
import json, time, os, sys, requests, argparse
from typing import List, Dict, Any

sys.stdout.reconfigure(line_buffering=True, encoding='utf-8')

parser = argparse.ArgumentParser()
parser.add_argument("--sessionid", required=True, help="Instagram sessionid cookie")
parser.add_argument("--csrftoken", required=True, help="Instagram csrftoken cookie")
parser.add_argument("--uid", required=True, help="Your Instagram user ID")
parser.add_argument("--user-dir", default=".ig_cache", help="Directory to store cache (default: .ig_cache)")
args = parser.parse_args()

CACHE_DIR = args.user_dir
os.makedirs(CACHE_DIR, exist_ok=True)

API_ROOT = "https://i.instagram.com/api/v1"
HEADERS = {
    "User-Agent": "Instagram 261.0.0.13.109 Android (25/7.1.2; 320dpi; 900x1600; samsung; SM-G977N; beyond1q; qcom; en_US; 444110489)",
    "Accept": "*/*",
    "Accept-Language": "en-US,en;q=0.5",
    "X-IG-App-ID": "936619743392459",
}

session = requests.Session()
session.headers.update(HEADERS)
session.cookies.set("sessionid", args.sessionid)
session.cookies.set("csrftoken", args.csrftoken)

# ---------- helpers ----------
def save_json(name: str, data: Any):
    with open(os.path.join(CACHE_DIR, f"{name}.json"), "w", encoding="utf8") as f:
        json.dump(data, f, indent=2, ensure_ascii=False)

def load_json(name: str, default=None):
    path = os.path.join(CACHE_DIR, f"{name}.json")
    return json.load(open(path, encoding="utf8")) if os.path.isfile(path) else default

def get_page(url: str, params: dict, retries: int = 10) -> dict:
    for attempt in range(retries):
        r = session.get(url, params=params, timeout=30)
        if r.status_code == 200:
            return r.json()
        if r.status_code == 400 and "feedback_required" in r.text:
            wait = 30
            print(f"[RATE_LIMIT] Waiting {wait}s before retry (attempt {attempt+1}/{retries})...", flush=True)
            for i in range(wait):
                print(f"  ⏳ {wait - i}s remaining...", flush=True)
                time.sleep(1)
            continue
        print("HTTP", r.status_code, r.text[:300])
        sys.exit("Aborted")
    sys.exit("Too many rate-limit hits – try again later")

# ---------- gentle fetch ----------
def gentle_fetch(list_name: str, uid: str) -> List[Dict[str, Any]]:
    cache_file = f"{list_name}_{uid}"
    temp_file  = f"{cache_file}_partial"

    items = load_json(temp_file, [])
    seen_ids = {u["pk"] for u in items}
    max_id = items[-1]["pk"] if items else ""

    print(f"[STEP_START]Fetching {list_name}", flush=True)
    print(f"Downloading {list_name} …  (resumable, {len(items)} already in cache)", flush=True)

    page_count = 0
    while True:
        data = get_page(f"{API_ROOT}/friendships/{uid}/{list_name}/",
                        {"count": 50, "max_id": max_id} if max_id else {"count": 50})

        users = data.get("users", [])
        new = [u for u in users if u["pk"] not in seen_ids]
        items.extend(new)
        seen_ids.update(u["pk"] for u in new)
        page_count += 1
        print(f"  Page {page_count}: +{len(new)} new, total {len(items)}", flush=True)

        save_json(temp_file, items)

        time.sleep(3)

        max_id = data.get("next_max_id")
        if not max_id:
            break

    print(f"[STEP_COMPLETE]Fetching {list_name}: {len(items)} total", flush=True)

    os.replace(os.path.join(CACHE_DIR, temp_file + ".json"),
               os.path.join(CACHE_DIR, cache_file + ".json"))
    return items

# ---------- main ----------
def main():
    uid = args.uid
    print("[INIT]Starting fetch process...", flush=True)

    followers = gentle_fetch("followers", uid)
    following = gentle_fetch("following", uid)

    followers_pk = {u["pk"] for u in followers}
    non_followers = [u for u in following if u["pk"] not in followers_pk]

    print("\n[STEP_START]Generating non-followers list", flush=True)
    print(f"You follow {len(following)} accounts", flush=True)
    print(f"{len(followers)} accounts follow you", flush=True)
    print(f"Computing {len(non_followers)} non-followers...", flush=True)

    print("\n[STEP_START]Fetching follower counts", flush=True)
    for i, u in enumerate(non_followers):
        info = get_page(f"{API_ROOT}/users/{u['pk']}/info/", {})
        u["follower_count"] = info["user"]["follower_count"]
        percent = int((i + 1) / len(non_followers) * 100) if non_followers else 100
        print(f"  [{percent}%] {u['username']}: {u['follower_count']} followers", flush=True)
        time.sleep(1)

    print("[STEP_COMPLETE]Fetching follower counts", flush=True)

    print("\n[STEP_START]Saving results", flush=True)
    save_json("non_followers", non_followers)
    with open(os.path.join(CACHE_DIR, "non_followers.txt"), "w", encoding="utf8") as f:
        for u in sorted(non_followers, key=lambda x: x["username"]):
            f.write(u["username"] + "\n")
    print("[STEP_COMPLETE]Saving results", flush=True)

    print("\n[STEP_START]Summary", flush=True)
    print("All non-followers:", flush=True)
    for u in sorted(non_followers, key=lambda x: x["username"]):
        print(f"  • {u['username']}", flush=True)
    print("[STEP_COMPLETE]Summary", flush=True)

    # Cleanup: delete the large followers/following files
    followers_file = os.path.join(CACHE_DIR, f"followers_{uid}.json")
    following_file = os.path.join(CACHE_DIR, f"following_{uid}.json")
    try:
        if os.path.exists(followers_file):
            os.remove(followers_file)
            print(f"\nDeleted {followers_file}")
        if os.path.exists(following_file):
            os.remove(following_file)
            print(f"Deleted {following_file}")
    except Exception as e:
        print(f"Warning: Could not delete temp files: {e}")

if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        sys.exit("\nAborted by user")