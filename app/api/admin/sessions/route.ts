import { readFile } from "fs/promises";
import { join } from "path";
import { existsSync } from "fs";
import { NextResponse } from "next/server";

export async function GET() {
  try {
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
