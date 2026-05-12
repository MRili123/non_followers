import { NextRequest, NextResponse } from "next/server";
import { rm } from "fs/promises";
import { join, resolve } from "path";
import { existsSync } from "fs";

export async function DELETE(req: NextRequest) {
  try {
    const uid = req.nextUrl.searchParams.get("uid");

    if (!uid) {
      return NextResponse.json({ error: "Missing uid parameter" }, { status: 400 });
    }

    const projectRoot = resolve(process.cwd());
    const cacheDir = join(projectRoot, ".ig_cache", uid);
    console.log(`Cleaning up cache for uid ${uid} at path: ${cacheDir}`);

    const filesToDelete = [
      "followers.json",
      "following.json",
      "non_followers.json",
      "non_followers.txt",
      "user_stats.json",
      "cache_meta.json",
    ];

    let deletedCount = 0;
    for (const file of filesToDelete) {
      const filePath = join(cacheDir, file);
      if (existsSync(filePath)) {
        try {
          await rm(filePath, { force: true });
          console.log(`Deleted: ${filePath}`);
          deletedCount++;
        } catch (e) {
          console.error(`Failed to delete ${filePath}:`, e);
        }
      } else {
        console.log(`File does not exist: ${filePath}`);
      }
    }

    return NextResponse.json({
      success: true,
      message: `Cleaned up ${deletedCount} cache files for uid ${uid}`,
    });
  } catch (error) {
    console.error("Cleanup error:", error);
    return NextResponse.json(
      { error: "Failed to cleanup cache", details: String(error) },
      { status: 500 }
    );
  }
}
