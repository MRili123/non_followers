import axios, { AxiosInstance } from "axios";

const API_ROOT = "https://i.instagram.com/api/v1";
const HEADERS = {
  "User-Agent": "Instagram 261.0.0.13.109 Android (25/7.1.2; 320dpi; 900x1600; samsung; SM-G977N; beyond1q; qcom; en_US; 444110489)",
  "Accept": "*/*",
  "Accept-Language": "en-US,en;q=0.5",
  "X-IG-App-ID": "936619743392459",
};

interface InstagramUser {
  pk: string;
  username: string;
  full_name?: string;
  is_private?: boolean;
  is_verified?: boolean;
  profile_pic_url?: string;
  follower_count?: number;
  [key: string]: any;
}

interface SessionCookies {
  sessionid: string;
  csrftoken: string;
}

function createSession(cookies: SessionCookies): AxiosInstance {
  const cookieStore: Record<string, string> = {
    sessionid: cookies.sessionid,
    csrftoken: cookies.csrftoken,
  };

  const session = axios.create({
    headers: HEADERS,
    timeout: 30000,
  });

  // Intercept requests to add cookies
  session.interceptors.request.use((config) => {
    const cookieHeader = Object.entries(cookieStore)
      .map(([key, value]) => `${key}=${value}`)
      .join("; ");
    if (cookieHeader) {
      config.headers.Cookie = cookieHeader;
    } else {
      console.warn("[ERROR] No cookies available!");
    }
    return config;
  });

  // Intercept responses to update cookies from Set-Cookie headers
  session.interceptors.response.use(
    (response) => {
      const setCookieHeaders = response.headers["set-cookie"];
      if (setCookieHeaders) {
        const cookies = Array.isArray(setCookieHeaders) ? setCookieHeaders : [setCookieHeaders];
        cookies.forEach(cookie => {
          const match = cookie.match(/^([^=]+)=([^;]+)/);
          if (match) {
            cookieStore[match[1]] = match[2];
          }
        });
      }
      return response;
    },
    (error) => Promise.reject(error)
  );

  return session;
}

async function getPage(
  url: string,
  params: Record<string, any>,
  session: AxiosInstance,
  retries = 10
): Promise<any> {
  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      const response = await session.get(url, { params });
      console.log(`GET ${url.split("/").slice(-2).join("/")} → ${response.data?.users?.length || "?"} users`);
      return response.data;
    } catch (err: any) {
      const status = err.response?.status;
      const text = err.response?.data ? JSON.stringify(err.response.data) : err.message;

      if (status === 400 && text.includes("feedback_required")) {
        const wait = 30;
        console.log(`[RATE_LIMIT] Waiting ${wait}s before retry (attempt ${attempt + 1}/${retries})`);
        await new Promise(r => setTimeout(r, wait * 1000));
        continue;
      }

      if (status === 429) {
        const wait = Math.min(60 * (attempt + 1), 300);
        console.log(`Rate limited (429) – waiting ${wait}s before retry`);
        await new Promise(r => setTimeout(r, wait * 1000));
        continue;
      }

      if (status === 200) {
        return err.response.data;
      }

      console.error(`HTTP ${status}:`, text.slice(0, 200));
      if (attempt === retries - 1) throw err;
      await new Promise(r => setTimeout(r, 1000));
    }
  }
  throw new Error("Too many rate-limit hits");
}

// Cache sessions to reuse them (like Python's requests.Session)
const sessionCache = new Map<string, AxiosInstance>();

function getOrCreateSession(sessionId: string, cookies: SessionCookies): AxiosInstance {
  if (!sessionCache.has(sessionId)) {
    sessionCache.set(sessionId, createSession(cookies));
  }
  return sessionCache.get(sessionId)!;
}

export async function fetchCurrentUser(cookies: SessionCookies): Promise<InstagramUser> {
  const sessionId = `${cookies.sessionid}-${cookies.csrftoken}`.slice(0, 50);
  const session = getOrCreateSession(sessionId, cookies);
  const data = await getPage(`${API_ROOT}/accounts/current_user/`, {}, session);
  return data.user;
}

export async function gentleFetch(
  listName: "followers" | "following",
  uid: string,
  cookies: SessionCookies,
  onProgress?: (count: number, total: number) => void
): Promise<InstagramUser[]> {
  const sessionId = `${cookies.sessionid}-${cookies.csrftoken}`.slice(0, 50);
  const session = getOrCreateSession(sessionId, cookies);
  const items: InstagramUser[] = [];
  const seenIds = new Set<string>();
  let maxId = "";

  while (true) {
    const params: any = { count: 50 };
    if (maxId) params.max_id = maxId;

    const data = await getPage(
      `${API_ROOT}/friendships/${uid}/${listName}/`,
      params,
      session
    );

    const users = data.users || [];
    console.log(`[gentleFetch] ${listName}: got ${users.length} users, next_max_id=${data.next_max_id}`);
    const newUsers = users.filter((u: InstagramUser) => !seenIds.has(u.pk));

    items.push(...newUsers);
    newUsers.forEach((u: InstagramUser) => seenIds.add(u.pk));

    onProgress?.(items.length, 0);

    await new Promise(r => setTimeout(r, 3000));

    maxId = data.next_max_id;
    if (!maxId) break;
  }

  return items;
}

export async function fetchUserInfo(
  identifier: string,
  cookies: SessionCookies
): Promise<InstagramUser> {
  const sessionId = `${cookies.sessionid}-${cookies.csrftoken}`.slice(0, 50);
  const session = getOrCreateSession(sessionId, cookies);
  let user;

  if (/^\d+$/.test(identifier)) {
    const data = await getPage(
      `${API_ROOT}/users/${identifier}/info/`,
      {},
      session
    );
    user = data.user;
  } else {
    const data = await getPage(
      `${API_ROOT}/users/web_profile_info/`,
      { username: identifier },
      session
    );
    user = data.data?.user;
  }

  if (!user) throw new Error(`Could not find user: ${identifier}`);

  return {
    pk: String(user.pk || user.id),
    username: user.username,
    full_name: user.full_name,
    is_private: user.is_private,
    is_verified: user.is_verified,
    profile_pic_url: user.profile_pic_url,
    follower_count: user.follower_count,
    ...user,
  };
}

export async function unfollowUser(
  pk: string,
  cookies: SessionCookies
): Promise<boolean> {
  const sessionId = `${cookies.sessionid}-${cookies.csrftoken}`.slice(0, 50);
  const session = getOrCreateSession(sessionId, cookies);

  const response = await session.post(
    `https://www.instagram.com/web/friendships/${pk}/unfollow/`,
    {},
    {
      headers: {
        "Referer": "https://www.instagram.com/",
        "Origin": "https://www.instagram.com",
        "X-CSRFToken": cookies.csrftoken,
        "X-Requested-With": "XMLHttpRequest",
      },
    }
  );

  return response.data.status === "ok";
}
