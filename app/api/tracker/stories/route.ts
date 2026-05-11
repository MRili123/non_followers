import { NextResponse } from "next/server";
import { readFile } from "fs/promises";
import { join } from "path";

const API_ROOT = "https://i.instagram.com/api/v1";
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
  } catch {
    return [];
  }
}

export async function POST(request: Request) {
  try {
    const { pk, sessionid, csrftoken } = await request.json();
    if (!pk || !sessionid || !csrftoken) return NextResponse.json({ stories: [] });

    const extra = await getSessions();
    const sessions = [
      { sessionid, csrftoken },
      ...extra.filter((s: any) => s.sessionid !== sessionid),
    ];

    for (const s of sessions) {
      const decoded_sid = decodeURIComponent(s.sessionid);
      const decoded_csrf = decodeURIComponent(s.csrftoken);
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 15000);

      try {
        console.log(`[stories] Fetching stories for pk=${pk} with session...`);
        const url = `${API_ROOT}/feed/user/${pk}/story/`;
        console.log(`[stories] URL: ${url}`);

        const res = await fetch(url, {
          headers: {
            ...HEADERS,
            Cookie: `sessionid=${decoded_sid}; csrftoken=${decoded_csrf}`,
            "X-CSRFToken": decoded_csrf,
            "X-Requested-With": "XMLHttpRequest",
            "Sec-Fetch-Site": "same-origin",
            "Sec-Fetch-Mode": "cors",
            "Sec-Fetch-Dest": "empty",
            "Referer": "https://www.instagram.com/",
          },
          signal: controller.signal,
        });
        clearTimeout(timer);

        console.log(`[stories] Response status: ${res.status}`);
        const text = await res.text();
        console.log(`[stories] Raw response: ${text.substring(0, 500)}`);

        if (res.status === 429) {
          console.log(`[stories] Rate limited for pk=${pk}`);
          continue;
        }
        if (!res.ok) {
          console.log(`[stories] API error: status=${res.status} for pk=${pk}`);
          return NextResponse.json({ stories: [] });
        }

        const data = JSON.parse(text);
        console.log(`[stories] Parsed data:`, JSON.stringify(data).substring(0, 500));

        const items = data.reel?.items || data.items || [];
        console.log(`[stories] Found ${items.length} items for pk=${pk}`);

        const stories = items.map((item: any) => {
          const isVideo = item.media_type === 2;
          const url = isVideo ? item.video_versions?.[0]?.url : item.image_versions2?.candidates?.[0]?.url;
          return { id: item.pk, type: isVideo ? "video" : "image", url: url || "", taken_at: item.taken_at };
        }).filter((s: any) => s.url);

        console.log(`[stories] Returning ${stories.length} valid stories for pk=${pk}`);
        return NextResponse.json({ stories });
      } catch {
        clearTimeout(timer);
        continue;
      }
    }

    return NextResponse.json({ stories: [] });
  } catch (error: any) {
    return NextResponse.json({ stories: [], error: error.message });
  }
}
