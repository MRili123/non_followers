import { NextRequest, NextResponse } from "next/server";
import { gentleFetch } from "@/lib/instagram";
import { promises as fs } from "fs";
import path from "path";

const CACHE_DIR = ".ig_cache";

const IG_HEADERS = {
  "User-Agent": "Instagram 261.0.0.13.109 Android (25/7.1.2; 320dpi; 900x1600; samsung; SM-G977N; beyond1q; qcom; en_US; 444110489)",
  "X-IG-App-ID": "936619743392459",
  "Accept": "*/*",
  "Accept-Language": "en-US,en;q=0.5",
};

async function fetchWithRetry(
  url: string,
  headers: Record<string, string>,
  retries = 5,
  delayMs = 2000
): Promise<any> {
  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      const response = await fetch(url, { headers });

      if (response.status === 429 || (response.status === 400 && response.statusText.includes("Too Busy"))) {
        if (attempt < retries - 1) {
          const waitTime = Math.min(delayMs * Math.pow(2, attempt), 60000);
          console.log(`[RATE_LIMIT] Attempt ${attempt + 1}/${retries}: waiting ${waitTime}ms`);
          await new Promise(r => setTimeout(r, waitTime));
          continue;
        }
      }

      if (!response.ok) {
        const text = await response.text();
        console.error(`[FETCH_ERROR] ${response.status}: ${text.slice(0, 200)}`);
        if (attempt === retries - 1) {
          throw new Error(`Instagram API returned ${response.status}`);
        }
        await new Promise(r => setTimeout(r, delayMs));
        continue;
      }

      return response.json();
    } catch (err) {
      if (attempt === retries - 1) throw err;
      await new Promise(r => setTimeout(r, delayMs));
    }
  }
}

async function ensureDir(dir: string) {
  try {
    await fs.mkdir(dir, { recursive: true });
  } catch (e) {
    // ignore
  }
}

async function saveJson(name: string, data: any, userDir: string) {
  const filePath = path.join(userDir, `${name}.json`);
  await fs.writeFile(filePath, JSON.stringify(data, null, 2), "utf8");
}

async function checkCacheValid(userDir: string, maxAgeHours: number = 24): Promise<boolean> {
  try {
    const metaFile = path.join(userDir, "cache_meta.json");
    const metaContent = await fs.readFile(metaFile, "utf8");
    const meta = JSON.parse(metaContent);
    const cacheAge = (Date.now() - meta.timestamp) / (1000 * 60 * 60); // hours
    return cacheAge < maxAgeHours;
  } catch {
    return false;
  }
}

async function loadCachedData(userDir: string) {
  try {
    const followers = JSON.parse(await fs.readFile(path.join(userDir, "followers.json"), "utf8"));
    const following = JSON.parse(await fs.readFile(path.join(userDir, "following.json"), "utf8"));
    const nonFollowers = JSON.parse(await fs.readFile(path.join(userDir, "non_followers.json"), "utf8"));
    const userStats = JSON.parse(await fs.readFile(path.join(userDir, "user_stats.json"), "utf8"));
    return { followers, following, nonFollowers, userStats };
  } catch {
    return null;
  }
}

export async function POST(req: NextRequest) {
  try {
    const { sessionid, csrftoken, uid } = await req.json();

    if (!sessionid || !csrftoken || !uid) {
      return NextResponse.json(
        { error: "Missing credentials" },
        { status: 400 }
      );
    }

    const userDir = path.join(CACHE_DIR, uid);
    await ensureDir(userDir);

    // Check if cache is fresh (less than 24 hours old)
    const cacheIsValid = await checkCacheValid(userDir, 24);

    if (cacheIsValid) {
      const cachedData = await loadCachedData(userDir);
      if (cachedData) {
        // Return cached data via SSE
        const readable = new ReadableStream({
          start(controller) {
            controller.enqueue(
              new TextEncoder().encode(`data: ${JSON.stringify({ msg: "[CACHED] Loading from cache..." })}\n\n`)
            );
            controller.enqueue(
              new TextEncoder().encode(`data: ${JSON.stringify({
                followers: cachedData.followers,
                following: cachedData.following,
                nonFollowers: cachedData.nonFollowers,
                stats: cachedData.userStats,
                cached: true
              })}\n\n`)
            );
            controller.enqueue(
              new TextEncoder().encode(`data: ${JSON.stringify({ done: true })}\n\n`)
            );
            controller.close();
          }
        });

        return new NextResponse(readable, {
          headers: {
            "Content-Type": "text/event-stream",
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
          },
        });
      }
    }

    // Create a ReadableStream for server-sent events
    const readable = new ReadableStream({
      async start(controller) {
        try {
          const sendMessage = (msg: string) => {
            controller.enqueue(
              new TextEncoder().encode(`data: ${JSON.stringify({ msg })}\n\n`)
            );
          };

          const cookies = { sessionid, csrftoken };

          sendMessage("[STEP_START]Initializing");

          // Fetch current user info for dashboard
          let userStats = {
            username: "",
            follower_count: 0,
            following_count: 0,
            profile_pic_url: "",
            full_name: "",
          };

          // First try to get current user info from the API
          try {
            sendMessage(`Fetching user info...`);

            // Try mobile API first
            try {
              const userData = await fetchWithRetry(
                `https://i.instagram.com/api/v1/users/${uid}/info/`,
                {
                  ...IG_HEADERS,
                  "Cookie": `sessionid=${sessionid}; csrftoken=${csrftoken}`,
                }
              );

              if (userData?.user) {
                const user = userData.user;
                userStats = {
                  username: user?.username || "",
                  follower_count: user?.follower_count || 0,
                  following_count: user?.following_count || 0,
                  profile_pic_url: user?.profile_pic_url || "",
                  full_name: user?.full_name || "",
                };
                sendMessage(`✓ Loaded: @${userStats.username} (${userStats.follower_count} followers, ${userStats.following_count} following)`);
                await saveJson("user_stats", userStats, userDir);
              }
            } catch (userInfoError) {
              sendMessage(`⚠️ Mobile API failed, trying current_user endpoint...`);

              try {
                const currentUser = await fetchWithRetry(
                  `https://i.instagram.com/api/v1/accounts/current_user/`,
                  {
                    ...IG_HEADERS,
                    "Cookie": `sessionid=${sessionid}; csrftoken=${csrftoken}`,
                  }
                );

                if (currentUser) {
                  const user = currentUser.user;
                  userStats = {
                    username: user?.username || "",
                    follower_count: user?.follower_count || 0,
                    following_count: user?.following_count || 0,
                    profile_pic_url: user?.profile_pic_url || "",
                    full_name: user?.full_name || "",
                  };
                  sendMessage(`✓ Loaded via current_user: @${userStats.username} (${userStats.follower_count} followers, ${userStats.following_count} following)`);
                  await saveJson("user_stats", userStats, userDir);
                } else {
                  sendMessage(`⚠️ Could not fetch user stats`);
                }
              } catch (fallbackErr) {
                sendMessage(`⚠️ Fallback endpoint failed`);
                console.error("Fallback error:", fallbackErr);
              }
            }
          } catch (err) {
            sendMessage(`⚠️ Error fetching user info: ${err instanceof Error ? err.message : "Unknown error"}`);
            console.error("Failed to fetch user info:", err);
          }

          sendMessage("[STEP_COMPLETE]Initializing");

          // Fetch followers
          sendMessage("[STEP_START]Fetching followers");
          const followers = await gentleFetch("followers", uid, cookies, (count) => {
            sendMessage(`Fetching followers... (${count} so far)`);
          });
          sendMessage(`[STEP_COMPLETE]Fetching followers: ${followers.length} total`);

          // Fetch following
          sendMessage("[STEP_START]Fetching following");
          const following = await gentleFetch("following", uid, cookies, (count) => {
            sendMessage(`Fetching following... (${count} so far)`);
          });
          sendMessage(`[STEP_COMPLETE]Fetching following: ${following.length} total`);

          // Save followers and following lists
          await saveJson("followers", followers, userDir);
          await saveJson("following", following, userDir);

          // Find non-followers
          sendMessage("[STEP_START]Generating non-followers list");
          const followersPk = new Set(followers.map(u => u.pk));
          const nonFollowers = following.filter(u => !followersPk.has(u.pk));

          sendMessage(`You follow ${following.length} accounts`);
          sendMessage(`${followers.length} accounts follow you`);
          sendMessage(`Computing ${nonFollowers.length} non-followers...`);
          sendMessage("[STEP_COMPLETE]Generating non-followers list");

          // Fetch follower counts
          sendMessage("[STEP_START]Fetching follower counts");
          for (let i = 0; i < nonFollowers.length; i++) {
            const u = nonFollowers[i];
            const percent = Math.round(((i + 1) / nonFollowers.length) * 100);

            try {
              const data = await fetchWithRetry(
                `https://i.instagram.com/api/v1/users/${u.pk}/info/`,
                {
                  ...IG_HEADERS,
                  "Cookie": `sessionid=${sessionid}; csrftoken=${csrftoken}`,
                },
                3,
                1000
              );

              if (data?.user) {
                u.follower_count = data.user.follower_count || 0;
              }
            } catch (err) {
              console.error(`Failed to fetch info for ${u.username}:`, err);
            }

            sendMessage(`[${percent}%] ${u.username}: ${u.follower_count || "?"} followers`);

            // Rate limit - increase to 2s on Vercel
            await new Promise(r => setTimeout(r, 2000));
          }
          sendMessage("[STEP_COMPLETE]Fetching follower counts");

          // Save results
          sendMessage("[STEP_START]Saving results");
          await saveJson("non_followers", nonFollowers, userDir);

          const usernames = nonFollowers
            .sort((a, b) => a.username.localeCompare(b.username))
            .map(u => u.username)
            .join("\n");

          await fs.writeFile(
            path.join(userDir, "non_followers.txt"),
            usernames,
            "utf8"
          );

          // Save cache metadata (timestamp)
          await saveJson("cache_meta", {
            timestamp: Date.now(),
            expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
          }, userDir);

          sendMessage("[STEP_COMPLETE]Saving results");

          // Summary
          sendMessage("[STEP_START]Summary");
          for (const u of nonFollowers.sort((a, b) => a.username.localeCompare(b.username))) {
            sendMessage(`• ${u.username}`);
          }
          sendMessage("[STEP_COMPLETE]Summary");

          // Done
          controller.enqueue(
            new TextEncoder().encode(`data: ${JSON.stringify({ done: true })}\n\n`)
          );
          controller.close();
        } catch (error) {
          const errorMsg = error instanceof Error ? error.message : "Unknown error";
          controller.enqueue(
            new TextEncoder().encode(`data: ${JSON.stringify({ error: errorMsg })}\n\n`)
          );
          controller.close();
        }
      },
    });

    return new NextResponse(readable, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        "Connection": "keep-alive",
      },
    });
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: errorMsg }, { status: 500 });
  }
}
