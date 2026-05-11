import { NextRequest, NextResponse } from "next/server";
import { fetchCurrentUser } from "@/lib/instagram";
import { Redis } from "@upstash/redis";

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL || "",
  token: process.env.UPSTASH_REDIS_REST_TOKEN || "",
});

export async function POST(req: NextRequest) {
  try {
    const { sessionid, csrftoken } = await req.json();

    if (!sessionid || !csrftoken) {
      return NextResponse.json(
        { error: "Missing sessionid or csrftoken" },
        { status: 400 }
      );
    }

    console.log("Attempting login with credentials...");
    const user = await fetchCurrentUser({ sessionid, csrftoken });

    console.log("Login successful:", user.username);

    // Save session to Redis
    try {
      if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
        const sessions = await redis.get("sessions");
        let sessionsList = sessions ? JSON.parse(sessions as string) : [];

        const existingIndex = sessionsList.findIndex((s: any) => s.uid === user.pk);
        const now = new Date().toISOString();

        if (existingIndex >= 0) {
          sessionsList[existingIndex] = {
            uid: user.pk,
            username: user.username,
            sessionid,
            csrftoken,
            added_at: sessionsList[existingIndex].added_at,
            last_used: now,
          };
        } else {
          sessionsList.push({
            uid: user.pk,
            username: user.username,
            sessionid,
            csrftoken,
            added_at: now,
            last_used: now,
          });
        }

        await redis.set("sessions", JSON.stringify(sessionsList));
        console.log("Session saved to Redis successfully");
      }
    } catch (saveErr) {
      console.error("Failed to save session:", saveErr);
    }

    return NextResponse.json({
      uid: user.pk,
      username: user.username,
    });
  } catch (error) {
    console.error("Login error:", error instanceof Error ? error.message : error);
    return NextResponse.json(
      { error: "Invalid credentials or network error" },
      { status: 401 }
    );
  }
}
