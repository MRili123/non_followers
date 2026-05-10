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

    const followingFile = join(process.cwd(), ".ig_cache", uid, "following.json");

    if (!existsSync(followingFile)) {
      return NextResponse.json([]);
    }

    const content = await readFile(followingFile, "utf-8");
    const following = JSON.parse(content);

    return NextResponse.json(following);
  } catch (error) {
    console.error("Following error:", error);
    return NextResponse.json([]);
  }
}
