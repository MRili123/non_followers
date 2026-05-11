import { NextRequest, NextResponse } from "next/server";
import { fetchCurrentUser } from "@/lib/instagram";
import { readFile, writeFile } from "fs/promises";
import { join } from "path";
import { existsSync } from "fs";

async function saveSessions(sessions: any[]) {
  // Try to save to Redis if available
  try {
    const { Redis } = await import("@upstash/redis");
    const redis = new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL || "",
      token: process.env.UPSTASH_REDIS_REST_TOKEN || "",
    });
    if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
      await redis.set("sessions", JSON.stringify(sessions));
      console.log("Sessions saved to Redis");
      return;
    }
  } catch (e) {
    console.log("Redis not available, falling back to file storage");
  }

  // Fallback to file storage (local development)
  try {
    const sessionsFile = join(process.cwd(), "sessions.json");
    await writeFile(sessionsFile, JSON.stringify(sessions, null, 2), "utf-8");
    console.log("Sessions saved to file");
  } catch (e) {
    console.error("Failed to save sessions:", e);
  }
}

async function getSessions() {
  // Try to get from Redis first
  try {
    const { Redis } = await import("@upstash/redis");
    const redis = new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL || "",
      token: process.env.UPSTASH_REDIS_REST_TOKEN || "",
    });
    if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
      const data = await redis.get("sessions");
      if (data) {
        return JSON.parse(data as string);
      }
    }
  } catch (e) {
    console.log("Redis not available");
  }

  // Fallback to file storage
  try {
    const sessionsFile = join(process.cwd(), "sessions.json");
    if (existsSync(sessionsFile)) {
      const content = await readFile(sessionsFile, "utf-8");
      return JSON.parse(content);
    }
  } catch (e) {
    console.error("Failed to read sessions:", e);
  }

  return [];
}

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

    // Save session
    try {
      const sessions = await getSessions();
      const existingIndex = sessions.findIndex((s: any) => s.uid === user.pk);
      const now = new Date().toISOString();

      if (existingIndex >= 0) {
        sessions[existingIndex] = {
          uid: user.pk,
          username: user.username,
          sessionid,
          csrftoken,
          added_at: sessions[existingIndex].added_at,
          last_used: now,
        };
      } else {
        sessions.push({
          uid: user.pk,
          username: user.username,
          sessionid,
          csrftoken,
          added_at: now,
          last_used: now,
        });
      }

      await saveSessions(sessions);
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
