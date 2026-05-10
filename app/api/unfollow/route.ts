import { NextRequest, NextResponse } from "next/server";
import { unfollowUser } from "@/lib/instagram";
import { promises as fs } from "fs";
import path from "path";

export async function POST(req: NextRequest) {
  try {
    const { pk, sessionid, csrftoken, uid } = await req.json();

    if (!pk || !sessionid || !csrftoken) {
      return NextResponse.json({ error: "Missing parameters" }, { status: 400 });
    }

    const cookies = { sessionid, csrftoken };
    const success = await unfollowUser(pk, cookies);

    if (success) {
      // Remove from non_followers.json
      const userDir = path.join(".ig_cache", uid || "default");
      const filePath = path.join(userDir, "non_followers.json");

      try {
        const content = await fs.readFile(filePath, "utf8");
        const users = JSON.parse(content);
        const filtered = users.filter((u: any) => u.pk !== pk);
        await fs.writeFile(filePath, JSON.stringify(filtered, null, 2), "utf8");
      } catch (e) {
        // File might not exist yet
      }

      return NextResponse.json({ ok: true });
    } else {
      return NextResponse.json(
        { error: "Instagram rejected request" },
        { status: 400 }
      );
    }
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : "Unfollow failed";
    return NextResponse.json({ error: errorMsg }, { status: 500 });
  }
}
