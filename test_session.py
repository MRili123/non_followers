#!/usr/bin/env python3
import requests
import json
import sys

if len(sys.argv) != 3:
    print("Usage: python test_session.py <sessionid> <csrftoken>")
    sys.exit(1)

sessionid = sys.argv[1]
csrftoken = sys.argv[2]

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

print("=" * 60)
print("Testing Instagram API Access")
print("=" * 60)

# Test 1: Get current user
print("\n[TEST 1] Getting current user...")
try:
    r = session.get("https://i.instagram.com/api/v1/accounts/current_user/", timeout=10)
    if r.status_code == 200:
        data = r.json()
        if data.get("status") == "ok":
            user = data.get("user", {})
            print(f"✓ SUCCESS: {user.get('username')} (ID: {user.get('pk')})")
        else:
            print(f"✗ FAILED: {data}")
    else:
        print(f"✗ HTTP {r.status_code}: {r.text[:200]}")
except Exception as e:
    print(f"✗ ERROR: {e}")

# Test 2: Get followers list
print("\n[TEST 2] Getting followers list...")
try:
    uid = user.get('pk')
    r = session.get(f"https://i.instagram.com/api/v1/friendships/{uid}/followers/",
                   params={"count": 10}, timeout=10)
    if r.status_code == 200:
        data = r.json()
        if "users" in data:
            print(f"✓ SUCCESS: Got {len(data['users'])} followers")
        else:
            print(f"✗ FAILED: {data}")
    else:
        print(f"✗ HTTP {r.status_code}: {r.text[:200]}")
except Exception as e:
    print(f"✗ ERROR: {e}")

# Test 3: Get following list
print("\n[TEST 3] Getting following list...")
try:
    r = session.get(f"https://i.instagram.com/api/v1/friendships/{uid}/following/",
                   params={"count": 10}, timeout=10)
    if r.status_code == 200:
        data = r.json()
        if "users" in data:
            print(f"✓ SUCCESS: Got {len(data['users'])} following")
        else:
            print(f"✗ FAILED: {data}")
    else:
        print(f"✗ HTTP {r.status_code}: {r.text[:200]}")
except Exception as e:
    print(f"✗ ERROR: {e}")

print("\n" + "=" * 60)
print("Diagnostics complete!")
print("=" * 60)
