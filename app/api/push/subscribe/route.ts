import { NextRequest, NextResponse } from "next/server";
import { savePushSubscription } from "@/lib/push-server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const sub = body?.subscription;
    const endpoint = typeof sub?.endpoint === "string" ? sub.endpoint : null;
    if (!endpoint) {
      return NextResponse.json(
        { ok: false, error: "subscription.endpoint required" },
        { status: 400 },
      );
    }

    const result = await savePushSubscription(
      {
        endpoint,
        keys: sub.keys,
        expirationTime: sub.expirationTime ?? null,
      },
      body?.prefs,
    );

    return NextResponse.json({
      ok: true,
      stored: result.stored,
      note:
        result.stored === "supabase"
          ? "Subscription stored in Supabase."
          : result.stored === "memory"
            ? "Subscription held in process memory (add Supabase table for multi-instance)."
            : result.error || "not stored",
    });
  } catch {
    return NextResponse.json({ ok: false, error: "bad body" }, { status: 400 });
  }
}
