import { NextRequest, NextResponse } from "next/server";
import { readFile } from "fs/promises";
import { join } from "path";
import { existsSync } from "fs";

export async function GET(req: NextRequest) {
  try {
    const uid = req.nextUrl.searchParams.get("uid");

    if (!uid) {
      return NextResponse.json({ error: "Missing uid parameter" }, { status: 400 });
    }

    const statsFile = join(process.cwd(), ".ig_cache", uid, "user_stats.json");

    if (!existsSync(statsFile)) {
      return NextResponse.json({ error: "Stats not found" }, { status: 404 });
    }

    const content = await readFile(statsFile, "utf-8");
    const stats = JSON.parse(content);

    return NextResponse.json(stats);
  } catch (error) {
    console.error("Stats error:", error);
    return NextResponse.json(
      { error: "Failed to load stats" },
      { status: 500 }
    );
  }
}
