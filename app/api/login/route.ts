import { NextRequest, NextResponse } from "next/server";
import { fetchCurrentUser } from "@/lib/instagram";
import { readFile, writeFile } from "fs/promises";
import { join } from "path";
import { existsSync } from "fs";

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

    // Save session to sessions.json
    try {
      const sessionsFile = join(process.cwd(), "sessions.json");
      let sessions = [];

      if (existsSync(sessionsFile)) {
        const content = await readFile(sessionsFile, "utf-8");
        sessions = JSON.parse(content);
      }

      // Check if session already exists for this uid
      const existingIndex = sessions.findIndex((s: any) => s.uid === user.pk);
      const now = new Date().toISOString();

      if (existingIndex >= 0) {
        // Update existing session
        sessions[existingIndex] = {
          uid: user.pk,
          username: user.username,
          sessionid,
          csrftoken,
          added_at: sessions[existingIndex].added_at,
          last_used: now,
        };
      } else {
        // Add new session
        sessions.push({
          uid: user.pk,
          username: user.username,
          sessionid,
          csrftoken,
          added_at: now,
          last_used: now,
        });
      }

      await writeFile(sessionsFile, JSON.stringify(sessions, null, 2), "utf-8");
      console.log("Session saved successfully");
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
