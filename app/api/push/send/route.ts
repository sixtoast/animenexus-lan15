import { NextRequest, NextResponse } from "next/server";
import { sendPushToAll } from "@/lib/push-server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Broadcast a test/admin push to all stored subscriptions.
 * Auth: Authorization: Bearer $PUSH_SEND_SECRET (or query secret= for manual tests).
 */
export async function POST(req: NextRequest) {
  const expected = (process.env.PUSH_SEND_SECRET || "").trim();
  if (!expected) {
    return NextResponse.json(
      { ok: false, error: "PUSH_SEND_SECRET not configured" },
      { status: 503 },
    );
  }

  const auth = req.headers.get("authorization") || "";
  const bearer = auth.startsWith("Bearer ") ? auth.slice(7).trim() : "";
  const q = req.nextUrl.searchParams.get("secret") || "";
  if (bearer !== expected && q !== expected) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  let title = "AnimeNexus";
  let body = "A new signal is on the radar.";
  let url = "/tools/signals";
  let tag = "animenexus-signal";

  try {
    const j = await req.json();
    if (typeof j.title === "string" && j.title.trim()) title = j.title.trim();
    if (typeof j.body === "string" && j.body.trim()) body = j.body.trim();
    if (typeof j.url === "string" && j.url.trim()) url = j.url.trim();
    if (typeof j.tag === "string" && j.tag.trim()) tag = j.tag.trim();
  } catch {
    /* empty body ok */
  }

  const result = await sendPushToAll({ title, body, url, tag });
  return NextResponse.json({ ok: true, ...result });
}
