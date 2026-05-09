#!/usr/bin/env python3
import json
import os
import sys
import requests
import argparse

parser = argparse.ArgumentParser()
parser.add_argument("pk", help="User ID to check")
parser.add_argument("--sessionid", required=True, help="Instagram sessionid cookie")
parser.add_argument("--csrftoken", required=True, help="Instagram csrftoken cookie")
args = parser.parse_args()

pk = args.pk
sessionid = args.sessionid
csrftoken = args.csrftoken

session = requests.Session()
session.cookies.set("sessionid", sessionid, domain=".instagram.com")
session.cookies.set("csrftoken", csrftoken, domain=".instagram.com")

# Instagram endpoint to get current user's followers
url = f"https://i.instagram.com/api/v1/friendships/show/{pk}/"
# Using Instagram API from Android headers
headers = {
    "User-Agent": "Instagram 261.0.0.13.109 Android",
    "X-IG-App-ID": "936619743392459",
    "Referer": "https://www.instagram.com/",
    "X-CSRFToken": csrftoken
}

r = session.get(url, headers=headers)

try:
    data = r.json()
except:
    sys.exit(f"Failed to parse Instagram response: {r.text}")

# Check if user follows me
follows_back = data.get("followed_by", False)
username = data.get("user", {}).get("username", "")

print(json.dumps({"pk": pk, "username": username, "follows_back": follows_back}))
