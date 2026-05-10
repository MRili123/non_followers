import { NextRequest, NextResponse } from "next/server";
import { fetchUserInfo } from "@/lib/instagram";

export async function POST(req: NextRequest) {
  try {
    const { pk, sessionid, csrftoken } = await req.json();

    if (!pk || !sessionid || !csrftoken) {
      return NextResponse.json(
        { error: "Missing parameters" },
        { status: 400 }
      );
    }

    const cookies = { sessionid, csrftoken };
    const user = await fetchUserInfo(pk, cookies);

    return NextResponse.json(user);
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : "Check failed";
    return NextResponse.json({ error: errorMsg }, { status: 500 });
  }
}
