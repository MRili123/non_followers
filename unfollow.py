# import requests

# def unfollow_user():
#     # Ask for inputs
#     session_id = input("Enter your Session ID: ").strip()
#     user_id_to_unfollow = input("Enter the User ID to unfollow: ").strip()

#     if not session_id or not user_id_to_unfollow:
#         print("Error: Session ID and User ID cannot be empty.")
#         return

#     # The correct endpoint for unfollowing via Instagram Web API
#     endpoint = f"https://www.instagram.com/web/friendships/{user_id_to_unfollow}/unfollow/"

#     # You need the CSRF token as well. 
#     # Often, the sessionid and csrftoken are linked. 
#     # If you don't have your csrftoken, you might need to grab it from your browser cookies.
#     csrf_token = input("Enter your CSRF Token (often found in browser cookies alongside sessionid): ").strip()

#     if not csrf_token:
#         print("Error: CSRF Token is required for Instagram requests.")
#         return

#     # Setup headers
#     headers = {
#         "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
#         "Content-Type": "application/x-www-form-urlencoded",
#         "Referer": "https://www.instagram.com/",
#         "X-CSRFToken": csrf_token, 
#         "Cookie": f"sessionid={session_id}; csrftoken={csrf_token}" 
#     }

#     # Create a session to handle cookies automatically if needed
#     session = requests.Session()
    
#     try:
#         print(f"Attempting to unfollow user {user_id_to_unfollow}...")
        
#         response = session.post(endpoint, headers=headers)

#         # Check if request was successful
#         if response.status_code == 200:
#             print("Success: You have successfully unfollowed the user.")
#         else:
#             print(f"Error: Failed to unfollow. Status Code: {response.status_code}")
#             print(f"Response: {response.text}")

#     except requests.exceptions.RequestException as e:
#         print(f"Network Error: {e}")

# if __name__ == "__main__":
#     unfollow_user()


#!/usr/bin/env python3
import json
import os
import sys
import requests
import argparse

parser = argparse.ArgumentParser()
parser.add_argument("pk", help="User ID to unfollow")
parser.add_argument("--sessionid", required=True, help="Instagram sessionid cookie")
parser.add_argument("--csrftoken", required=True, help="Instagram csrftoken cookie")
parser.add_argument("--user-dir", default=".ig_cache", help="Directory containing cache")
args = parser.parse_args()

pk = args.pk
sessionid = args.sessionid
csrftoken = args.csrftoken
CACHE = args.user_dir

session = requests.Session()
session.cookies.set("sessionid", sessionid, domain=".instagram.com")
session.cookies.set("csrftoken", csrftoken, domain=".instagram.com")

url = f"https://www.instagram.com/web/friendships/{pk}/unfollow/"

headers = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
    "Referer": "https://www.instagram.com/",
    "Origin": "https://www.instagram.com",
    "X-CSRFToken": csrftoken,
    "X-Requested-With": "XMLHttpRequest",
    "Accept": "*/*",
    "Accept-Language": "en-US,en;q=0.9"
}

r = session.post(url, headers=headers)
try:
    data = r.json()
except:
    sys.exit(f"Failed to parse Instagram response: {r.text}")

# Check actual status
if data.get("status") == "ok":
    # Remove from non_followers.json
    path = os.path.join(CACHE, "non_followers.json")
    if os.path.exists(path):
        with open(path, "r") as f:
            users = json.load(f)
        users = [u for u in users if u["pk"] != pk]
        with open(path, "w") as f:
            json.dump(users, f, indent=2)
    print("OK")
else:
    sys.exit(f"Instagram rejected request: {data}")
