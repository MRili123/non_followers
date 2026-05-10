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

    const followersFile = join(process.cwd(), ".ig_cache", uid, "followers.json");

    if (!existsSync(followersFile)) {
      return NextResponse.json([]);
    }

    const content = await readFile(followersFile, "utf-8");
    const followers = JSON.parse(content);

    return NextResponse.json(followers);
  } catch (error) {
    console.error("Followers error:", error);
    return NextResponse.json([]);
  }
}
