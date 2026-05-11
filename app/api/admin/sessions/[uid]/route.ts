import { readFile, writeFile } from "fs/promises";
import { join } from "path";
import { existsSync } from "fs";
import { NextResponse } from "next/server";

async function saveSessions(sessions: any[]) {
  // Try Redis first
  try {
    const { Redis } = await import("@upstash/redis");
    const redis = new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL || "",
      token: process.env.UPSTASH_REDIS_REST_TOKEN || "",
    });
    if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
      await redis.set("sessions", JSON.stringify(sessions));
      return;
    }
  } catch (e) {
    console.log("Redis not available, falling back to file");
  }

  // Fallback to file storage
  const sessionsFile = join(process.cwd(), "sessions.json");
  await writeFile(sessionsFile, JSON.stringify(sessions, null, 2));
}

async function getSessions() {
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
        return JSON.parse(data as string);
      }
    }
  } catch (e) {
    console.log("Redis not available");
  }

  // Fallback to file storage
  const sessionsFile = join(process.cwd(), "sessions.json");
  if (existsSync(sessionsFile)) {
    const content = await readFile(sessionsFile, "utf-8");
    return JSON.parse(content);
  }
  return [];
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ uid: string }> }
) {
  try {
    const { uid } = await params;
    const sessions = await getSessions();

    const filteredSessions = sessions.filter((session: any) => session.uid !== uid);

    if (filteredSessions.length === sessions.length) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }

    await saveSessions(filteredSessions);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete session:", error);
    return NextResponse.json({ error: "Failed to delete session" }, { status: 500 });
  }
}
