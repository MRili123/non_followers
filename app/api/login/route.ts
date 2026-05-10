import { NextRequest, NextResponse } from "next/server";
import { fetchCurrentUser } from "@/lib/instagram";

export async function POST(req: NextRequest) {
  try {
    const { sessionid, csrftoken } = await req.json();

    if (!sessionid || !csrftoken) {
      return NextResponse.json(
        { error: "Missing sessionid or csrftoken" },
        { status: 400 }
      );
    }

    console.log("Attempting login with credentials...");
    const user = await fetchCurrentUser({ sessionid, csrftoken });

    console.log("Login successful:", user.username);
    return NextResponse.json({
      uid: user.pk,
      username: user.username,
    });
  } catch (error) {
    console.error("Login error:", error instanceof Error ? error.message : error);
    return NextResponse.json(
      { error: "Invalid credentials or network error" },
      { status: 401 }
    );
  }
}
