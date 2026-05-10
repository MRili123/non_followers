import { NextRequest, NextResponse } from "next/server";
import { rm } from "fs/promises";
import { join } from "path";
import { existsSync } from "fs";

export async function DELETE(req: NextRequest) {
  try {
    const uid = req.nextUrl.searchParams.get("uid");

    if (!uid) {
      return NextResponse.json({ error: "Missing uid parameter" }, { status: 400 });
    }

    const cacheDir = join(process.cwd(), ".ig_cache", uid);

    if (existsSync(cacheDir)) {
      await rm(cacheDir, { recursive: true, force: true });
    }

    return NextResponse.json({ success: true, message: `Cleaned up cache for uid ${uid}` });
  } catch (error) {
    console.error("Cleanup error:", error);
    return NextResponse.json(
      { error: "Failed to cleanup cache" },
      { status: 500 }
    );
  }
}
