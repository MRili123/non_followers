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

    const user = await fetchCurrentUser({ sessionid, csrftoken });

    return NextResponse.json({
      uid: user.pk,
      username: user.username,
    });
  } catch (error) {
    console.error("Login error:", error);
    return NextResponse.json(
      { error: "Invalid credentials or network error" },
      { status: 401 }
    );
  }
}
