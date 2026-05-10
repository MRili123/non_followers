import { NextRequest, NextResponse } from "next/server";
import { gentleFetch } from "@/lib/instagram";
import { promises as fs } from "fs";
import path from "path";

const CACHE_DIR = ".ig_cache";

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

          try {
            const userResponse = await fetch(
              `https://i.instagram.com/api/v1/users/${uid}/info/`,
              {
                headers: {
                  "User-Agent": "Instagram 261.0.0.13.109 Android (25/7.1.2; 320dpi; 900x1600; samsung; SM-G977N; beyond1q; qcom; en_US; 444110489)",
                  "X-IG-App-ID": "936619743392459",
                  "Accept": "*/*",
                  "Accept-Language": "en-US,en;q=0.5",
                  "Cookie": `sessionid=${sessionid}; csrftoken=${csrftoken}`,
                },
              }
            );

            if (userResponse.ok) {
              const userData = await userResponse.json();
              const user = userData.user;
              userStats = {
                username: user.username || "",
                follower_count: user.follower_count || 0,
                following_count: user.following_count || 0,
                profile_pic_url: user.profile_pic_url || "",
                full_name: user.full_name || "",
              };
              await saveJson("user_stats", userStats, userDir);
            }
          } catch (err) {
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
              const response = await fetch(
                `https://i.instagram.com/api/v1/users/${u.pk}/info/`,
                {
                  headers: {
                    "User-Agent": "Instagram 261.0.0.13.109 Android (25/7.1.2; 320dpi; 900x1600; samsung; SM-G977N; beyond1q; qcom; en_US; 444110489)",
                    "X-IG-App-ID": "936619743392459",
                    "Accept": "*/*",
                    "Accept-Language": "en-US,en;q=0.5",
                    "Cookie": `sessionid=${sessionid}; csrftoken=${csrftoken}`,
                  },
                }
              );

              if (response.ok) {
                const data = await response.json();
                u.follower_count = data.user?.follower_count || 0;
              }
            } catch (err) {
              console.error(`Failed to fetch info for ${u.username}:`, err);
            }

            sendMessage(`[${percent}%] ${u.username}: ${u.follower_count || "?"} followers`);

            // Rate limit
            await new Promise(r => setTimeout(r, 1000));
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
