# Project Context for Claude

## What This App Does
Instagram Non-Follower Tracker — logs in with Instagram session cookies, fetches followers/following lists, computes who doesn't follow back, and lets you unfollow them.

## Stack
- Next.js 15, TypeScript, App Router
- No database — uses local JSON files for cache and sessions
- `lib/instagram.ts` — all Instagram API calls (axios + cookie session)

## Running Locally
```
npm run dev  →  http://localhost:3000
```

---

## Key Files

| File | Purpose |
|------|---------|
| `lib/instagram.ts` | Instagram API client (fetchUserInfo, fetchCurrentUser, gentleFetch, unfollowUser) |
| `app/page.tsx` | Root SPA — manages all state, switches between views |
| `components/ResultsPage.tsx` | Main dashboard with tabs: Home, Followers, Following, Non-Followers, **User Tracker** |
| `components/FetchPage.tsx` | Progress screen while fetching data |
| `components/LoginPage.tsx` | Login form |
| `sessions.json` | Stores all active Instagram sessions (server-side) |
| `.ig_cache/<uid>/` | Per-user cache: followers.json, following.json, non_followers.json, user_stats.json |

## API Routes

| Route | Method | What it does |
|-------|--------|-------------|
| `/api/login` | POST | Validates Instagram cookies, returns uid/username |
| `/api/fetch` | POST | SSE stream — fetches followers+following, saves to cache |
| `/api/results?uid=` | GET | Returns non_followers.json from cache |
| `/api/stats?uid=` | GET | Returns user_stats.json from cache |
| `/api/followers?uid=` | GET | Returns followers.json from cache |
| `/api/following?uid=` | GET | Returns following.json from cache |
| `/api/unfollow` | POST | Unfollows a user |
| `/api/check` | POST | Fetches detailed info for a single user by PK |
| `/api/cleanup?uid=` | DELETE | Deletes all cache files for a user |
| `/api/img?url=` | GET | Proxy for Instagram CDN images (avoids CORS) |
| `/api/admin/sessions` | GET | Returns all sessions from sessions.json |
| `/api/admin/sessions/[uid]` | DELETE | Removes one session from sessions.json |
| `/api/tracker/profile` | POST | Fetches user profile + friendship status + last active |
| `/api/tracker/stories` | POST | Fetches user's active stories (images & video) |

---

## Admin Panel (`/ilias/m9wd`)
- Login: `iliasm9wd` / `iliasm9wd`
- **Theme**: full green (#31a24c) and black (#000)
- **Table layout** showing all session fields: USERNAME, UID, SESSION ID, CSRF TOKEN, ADDED AT, LAST USED, ACTION
- **Copy buttons** (📋) on SESSION ID and CSRF TOKEN — click copies to clipboard, shows ✓ for 2s
- **Delete button** per row — removes session from sessions.json via DELETE /api/admin/sessions/[uid]
- **Scrollable** with custom green webkit scrollbar

---

## User Tracker Tab (in main app at `/`)
Tab "🔍 User Tracker" in the ResultsPage sidebar.

**Search any Instagram username to get:**
- Profile pic (with download button)
- Username, full name, bio
- Public / Private / Verified badges
- Posts / Followers / Following counts
- "Follows You" / "Doesn't Follow You" badge
- "You Follow" / "You Don't Follow" badge
- Last active time (Instagram privacy-dependent)
- Stories section — auto-loads active stories with download buttons (image + video)

**State added to ResultsPage.tsx:**
`trackerInput, trackerData, trackerStories, trackerLoading, trackerStoriesLoading, trackerError`

**Functions added to ResultsPage.tsx:**
- `handleTrackerSearch()` — searches user, auto-fetches stories
- `fetchTrackerStories(pk)` — fetches stories for a pk
- `handleDownload(url, filename)` — proxies through /api/img, triggers browser blob download

---

## Instagram API Details
Base URL: `https://i.instagram.com/api/v1`

Key endpoints used:
- `/accounts/current_user/` — validate session
- `/friendships/{uid}/followers/` — paginated followers
- `/friendships/{uid}/following/` — paginated following
- `/users/{pk}/info/` — user info by numeric ID
- `/users/web_profile_info/?username=X` — user info by username
- `/friendships/show/{pk}/` — friendship status (followed_by, following)
- `/feed/user/{pk}/story/` — active stories
- `/direct_v2/presence/` — last active timestamp

Auth: Cookie header with `sessionid` and `csrftoken`
User-Agent: `Instagram 261.0.0.13.109 Android ...`

---

## sessions.json Format
```json
[
  {
    "uid": "12345",
    "username": "someuser",
    "sessionid": "...",
    "csrftoken": "...",
    "added_at": "2026-05-10T15:00:00.000Z",
    "last_used": "2026-05-10T17:00:00.000Z"
  }
]
```

---

## Known Limitations
- Last active time often unavailable (Instagram privacy settings)
- Story access requires account to be public or you follow them
- Rate limiting: Instagram throttles heavy requests — app has retry logic (3s delay between pages, exponential backoff on 429)
- Sessions expire — if login fails, get fresh cookies from browser
