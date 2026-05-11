import { readFile, writeFile } from "fs/promises";
import { join } from "path";
import { existsSync } from "fs";
import { NextResponse } from "next/server";

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ uid: string }> }
) {
  try {
    const { uid } = await params;
    // Use /tmp for Vercel, fallback to project root for local
    const sessionsFile = process.env.VERCEL ? "/tmp/sessions.json" : join(process.cwd(), "sessions.json");

    if (!existsSync(sessionsFile)) {
      return NextResponse.json({ error: "Sessions file not found" }, { status: 404 });
    }

    const content = await readFile(sessionsFile, "utf-8");
    let sessions = JSON.parse(content);

    const filteredSessions = sessions.filter((session: any) => session.uid !== uid);

    if (filteredSessions.length === sessions.length) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }

    await writeFile(sessionsFile, JSON.stringify(filteredSessions, null, 2));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete session:", error);
    return NextResponse.json({ error: "Failed to delete session" }, { status: 500 });
  }
}
