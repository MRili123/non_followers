import { readFile } from "fs/promises";
import { join } from "path";
import { existsSync } from "fs";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    // Try Redis first
    try {
      const { Redis } = await import("@upstash/redis");
      const redis = new Redis({
        url: process.env.UPSTASH_REDIS_REST_URL || "",
        token: process.env.UPSTASH_REDIS_REST_TOKEN || "",
      });
      if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
        const data = await redis.get("sessions");
        if (data) {
          return NextResponse.json(JSON.parse(data as string));
        }
      }
    } catch (e) {
      console.log("Redis not available, falling back to file");
    }

    // Fallback to file storage
    const sessionsFile = join(process.cwd(), "sessions.json");

    if (!existsSync(sessionsFile)) {
      return NextResponse.json([]);
    }

    const content = await readFile(sessionsFile, "utf-8");
    const sessions = JSON.parse(content);

    return NextResponse.json(sessions);
  } catch (error) {
    console.error("Failed to read sessions:", error);
    return NextResponse.json([]);
  }
}
