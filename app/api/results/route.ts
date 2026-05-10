import { NextRequest, NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";

export async function GET(req: NextRequest) {
  try {
    const uid = req.nextUrl.searchParams.get("uid");

    if (!uid) {
      return NextResponse.json({ error: "Missing uid" }, { status: 400 });
    }

    const filePath = path.join(".ig_cache", uid, "non_followers.json");
    const content = await fs.readFile(filePath, "utf8");
    return NextResponse.json(JSON.parse(content));
  } catch (err) {
    console.error("Error reading results:", err);
    return NextResponse.json([], { status: 200 });
  }
}
