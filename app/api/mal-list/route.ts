import { NextRequest, NextResponse } from "next/server";
import { fetchMalUserList } from "@/lib/mal-user";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const username = req.nextUrl.searchParams.get("username")?.trim();
  if (!username) {
    return NextResponse.json({ error: "username required" }, { status: 400 });
  }
  try {
    const data = await fetchMalUserList(username);
    return NextResponse.json(data);
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "MAL fetch failed" },
      { status: 502 },
    );
  }
}
