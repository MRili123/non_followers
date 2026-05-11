import { NextResponse } from "next/server";
import { Redis } from "@upstash/redis";

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL || "",
  token: process.env.UPSTASH_REDIS_REST_TOKEN || "",
});

export async function GET() {
  try {
    if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
      const sessions = await redis.get("sessions");
      if (sessions) {
        return NextResponse.json(JSON.parse(sessions as string));
      }
    }
    return NextResponse.json([]);
  } catch (error) {
    console.error("Failed to read sessions:", error);
    return NextResponse.json([]);
  }
}
