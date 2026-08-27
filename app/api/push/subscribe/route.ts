import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Acknowledge a push subscription.
 * Foundation: logs + accepts JSON; durable store / send comes in a later sprint.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const endpoint =
      typeof body?.subscription?.endpoint === "string"
        ? body.subscription.endpoint
        : null;
    if (!endpoint) {
      return NextResponse.json(
        { ok: false, error: "subscription.endpoint required" },
        { status: 400 },
      );
    }
    // Soft acknowledge — no secret leakage
    console.info(
      "[push] subscribe",
      endpoint.slice(0, 48) + "…",
      body?.prefs ? "with prefs" : "",
    );
    return NextResponse.json({
      ok: true,
      stored: false,
      note: "Subscription received. Server-side delivery needs VAPID private key + store (next sprint).",
    });
  } catch {
    return NextResponse.json({ ok: false, error: "bad body" }, { status: 400 });
  }
}
