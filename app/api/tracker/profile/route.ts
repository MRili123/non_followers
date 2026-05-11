import { NextResponse } from "next/server";
import axios from "axios";
import { readFile } from "fs/promises";
import { join } from "path";

const HEADERS = {
  "User-Agent": "Instagram 261.0.0.13.109 Android (25/7.1.2; 320dpi; 900x1600; samsung; SM-G977N; beyond1q; qcom; en_US; 444110489)",
  "Accept": "*/*",
  "Accept-Language": "en-US,en;q=0.5",
  "X-IG-App-ID": "936619743392459",
};

async function getSessions() {
  try {
    const file = await readFile(join(process.cwd(), "sessions.json"), "utf-8");
    return JSON.parse(file);
  } catch { return []; }
}

async function tryFetchUserWithAxios(username: string, sessionid: string, csrftoken: string): Promise<any> {
  try {
    const instance = axios.create({
      headers: { ...HEADERS },
      timeout: 20000,
      validateStatus: () => true,
    });

    // Set cookies properly
    const cookie = `sessionid=${sessionid}; csrftoken=${csrftoken}`;

    console.log(`[tracker] Fetching @${username} with authenticated request...`);

    // Search for user
    const searchRes = await instance.get("https://i.instagram.com/api/v1/users/search/", {
      params: { q: username, count: 30 },
      headers: { Cookie: cookie },
    });

    if (searchRes.status !== 200 || !searchRes.data?.users?.length) {
      console.log(`[tracker] Search failed (${searchRes.status})`);
      return null;
    }

    const user = searchRes.data.users[0];
    const pk = user.pk;

    // Get detailed user info
    const infoRes = await instance.get(`https://i.instagram.com/api/v1/users/${pk}/info/`, {
      headers: { Cookie: cookie },
    });

    if (infoRes.status !== 200) {
      console.log(`[tracker] Info fetch failed (${infoRes.status})`);
      return null;
    }

    const userInfo = infoRes.data.user;

    console.log(`[tracker] ✓ @${username}: ${userInfo.follower_count} followers, ${userInfo.following_count} following`);
    return {
      username: userInfo.username,
      id: String(pk),
      pk: String(pk),
      follower_count: userInfo.follower_count,
      following_count: userInfo.following_count,
      media_count: userInfo.media_count,
      is_private: userInfo.is_private,
      is_verified: userInfo.is_verified,
      full_name: userInfo.full_name,
      biography: userInfo.biography || "",
      profile_pic_url: userInfo.profile_pic_url,
    };
  } catch (err: any) {
    console.error(`[tracker] API fetch error: ${err.message}`);
    return null;
  }
}

export async function POST(request: Request) {
  try {
    const { username, sessionid, csrftoken, uid } = await request.json();
    if (!username || !sessionid || !csrftoken) {
      return NextResponse.json({ error: "Missing fields" }, { status: 400 });
    }

    const sessions = [
      { sessionid, csrftoken, uid },
      ...(await getSessions()).filter((s: any) => s.sessionid !== sessionid),
    ];

    let user: any = null;
    let usedSession: any = null;

    // Try with all available sessions
    for (const s of sessions) {
      user = await tryFetchUserWithAxios(username, s.sessionid, s.csrftoken);
      if (user) { usedSession = s; break; }
    }

    if (!user) {
      return NextResponse.json({ error: "Failed to fetch user — try again in a moment" }, { status: 429 });
    }

    const pk = String(user.pk || user.id);

    const followers = user.follower_count ?? 0;
    const following = user.following_count ?? 0;
    const posts = user.media_count ?? 0;
    console.log(`[tracker] @${user.username} — followers=${followers} following=${following}`);

    // Friendship
    let followsMe = false;
    let iFollow = false;
    if (usedSession) {
      try {
        const sid = decodeURIComponent(usedSession.sessionid);
        const csrf = decodeURIComponent(usedSession.csrftoken);
        const cookie = `sessionid=${sid}; csrftoken=${csrf}`;
        const instance = axios.create({ headers: { ...HEADERS, Cookie: cookie }, timeout: 10000, validateStatus: () => true });
        const res = await instance.get(`https://i.instagram.com/api/v1/friendships/show/${pk}/`);
        if (res.status === 200) {
          followsMe = res.data.followed_by || false;
          iFollow = res.data.following || false;
        }
      } catch {}
    }

    // Last active
    let lastActive: string | null = null;
    if (usedSession) {
      try {
        const sid = decodeURIComponent(usedSession.sessionid);
        const csrf = decodeURIComponent(usedSession.csrftoken);
        const cookie = `sessionid=${sid}; csrftoken=${csrf}`;
        const instance = axios.create({ headers: { ...HEADERS, Cookie: cookie }, timeout: 10000, validateStatus: () => true });
        const res = await instance.get("https://i.instagram.com/api/v1/direct_v2/presence/");
        if (res.status === 200) {
          const up = res.data.user_presence?.[pk];
          if (up?.last_activity_at_ms) lastActive = new Date(up.last_activity_at_ms).toISOString();
        }
      } catch {}
    }

    return NextResponse.json({
      pk,
      username: user.username,
      full_name: user.full_name || "",
      biography: user.biography || "",
      is_private: user.is_private || false,
      is_verified: user.is_verified || false,
      profile_pic_url: user.profile_pic_url_hd || user.profile_pic_url || "",
      follower_count: followers,
      following_count: following,
      media_count: posts,
      follows_me: followsMe,
      i_follow: iFollow,
      last_active: lastActive,
    });
  } catch (error: any) {
    console.error("[tracker/profile] error:", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
