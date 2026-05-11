import { NextResponse } from "next/server";
import { Redis } from "@upstash/redis";

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL || "",
  token: process.env.UPSTASH_REDIS_REST_TOKEN || "",
});

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ uid: string }> }
) {
  try {
    const { uid } = await params;

    if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
      const sessions = await redis.get("sessions");
      let sessionsList = sessions ? JSON.parse(sessions as string) : [];

      const filteredSessions = sessionsList.filter((session: any) => session.uid !== uid);

      if (filteredSessions.length === sessionsList.length) {
        return NextResponse.json({ error: "Session not found" }, { status: 404 });
      }

      await redis.set("sessions", JSON.stringify(filteredSessions));
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: "Redis not configured" }, { status: 500 });
  } catch (error) {
    console.error("Failed to delete session:", error);
    return NextResponse.json({ error: "Failed to delete session" }, { status: 500 });
  }
}
