import { NextRequest, NextResponse } from "next/server";
import { unlink } from "fs/promises";
import { join } from "path";
import { existsSync } from "fs";

export async function DELETE(req: NextRequest) {
  try {
    const uid = req.nextUrl.searchParams.get("uid");

    if (!uid) {
      return NextResponse.json({ error: "Missing uid parameter" }, { status: 400 });
    }

    const cacheDir = join(process.cwd(), ".ig_cache", uid);
    const filesToDelete = [
      "followers.json",
      "following.json",
      "non_followers.json",
      "non_followers.txt",
      "user_stats.json",
    ];

    for (const file of filesToDelete) {
      const filePath = join(cacheDir, file);
      if (existsSync(filePath)) {
        await unlink(filePath);
      }
    }

    return NextResponse.json({
      success: true,
      message: `Cleaned up cache files for uid ${uid}`,
    });
  } catch (error) {
    console.error("Cleanup error:", error);
    return NextResponse.json(
      { error: "Failed to cleanup cache" },
      { status: 500 }
    );
  }
}
