import { NextRequest, NextResponse } from "next/server";
import { gentleFetch } from "@/lib/instagram";

export async function POST(req: NextRequest) {
  try {
    const { sessionid, csrftoken, uid, target_pk } = await req.json();

    if (!sessionid || !csrftoken || !uid || !target_pk) {
      return NextResponse.json(
        { error: "Missing parameters" },
        { status: 400 }
      );
    }

    const cookies = { sessionid, csrftoken };

    // Re-fetch followers to check if user is following now
    const followers = await gentleFetch("followers", uid, cookies);
    const isFollowing = followers.some(f => f.pk === target_pk);

    return NextResponse.json({
      isFollowing,
      message: isFollowing
        ? "This user is now following you! ✓"
        : "This user is still not following you",
    });
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : "Check failed";
    return NextResponse.json({ error: errorMsg }, { status: 500 });
  }
}
