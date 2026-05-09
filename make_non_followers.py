#!/usr/bin/env python3
import json, os

CACHE_DIR = ".ig_cache"

def load(name):
    path = os.path.join(CACHE_DIR, name)
    with open(path, "r", encoding="utf8") as f:
        return json.load(f)

def save(name, data):
    path = os.path.join(CACHE_DIR, name)
    with open(path, "w", encoding="utf8") as f:
        json.dump(data, f, indent=2, ensure_ascii=False)

# change these filenames if yours are different
followers_file = [f for f in os.listdir(CACHE_DIR) if f.startswith("followers_") and f.endswith(".json")][0]
following_file = [f for f in os.listdir(CACHE_DIR) if f.startswith("following_") and f.endswith(".json")][0]

followers = load(followers_file)
following = load(following_file)

followers_pk = {u["pk"] for u in followers}
non_followers = [u for u in following if u["pk"] not in followers_pk]

save("non_followers.json", non_followers)

with open(os.path.join(CACHE_DIR, "non_followers.txt"), "w", encoding="utf8") as f:
    for u in sorted(non_followers, key=lambda x: x["username"]):
        f.write(u["username"] + "\n")

print("Done.")
print("Following:", len(following))
print("Followers:", len(followers))
print("Non-followers:", len(non_followers))