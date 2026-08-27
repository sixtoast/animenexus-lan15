import { NextRequest, NextResponse } from "next/server";
import {
  findAiringInWindow,
  formatAiringPushBody,
} from "@/lib/airing-push-job";
import { sendPushToAll } from "@/lib/push-server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Cron / manual job: scan airing window and optionally broadcast Web Push.
 *
 * Auth: Authorization: Bearer $CRON_SECRET (or PUSH_SEND_SECRET)
 * Query: dry=1 → list only, no push
 *        send=1 → send one summary push (default when not dry)
 *        per_title=1 → one push per title (cap 5)
 */
export async function GET(req: NextRequest) {
  return run(req);
}

export async function POST(req: NextRequest) {
  return run(req);
}

async function run(req: NextRequest) {
  const expected =
    (process.env.CRON_SECRET || "").trim() ||
    (process.env.PUSH_SEND_SECRET || "").trim();

  if (!expected) {
    return NextResponse.json(
      { ok: false, error: "CRON_SECRET or PUSH_SEND_SECRET required" },
      { status: 503 },
    );
  }

  const auth = req.headers.get("authorization") || "";
  const bearer = auth.startsWith("Bearer ") ? auth.slice(7).trim() : "";
  const qSecret = req.nextUrl.searchParams.get("secret") || "";
  // Vercel Cron sends Authorization: Bearer <CRON_SECRET> when configured
  if (bearer !== expected && qSecret !== expected) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  const dry =
    req.nextUrl.searchParams.get("dry") === "1" ||
    req.nextUrl.searchParams.get("dry") === "true";
  const perTitle = req.nextUrl.searchParams.get("per_title") === "1";

  const items = await findAiringInWindow({
    pastMinutes: 20,
    futureMinutes: 50,
    limit: 15,
  });

  if (dry || items.length === 0) {
    return NextResponse.json({
      ok: true,
      dry: dry || items.length === 0,
      count: items.length,
      items: items.map((i) => ({
        id: i.anilistId,
        title: i.title,
        episode: i.episode,
        minutesFromNow: i.minutesFromNow,
      })),
      push: null,
    });
  }

  const results: { title: string; sent: number; failed: number; skipped: string | null }[] =
    [];

  if (perTitle) {
    for (const item of items.slice(0, 5)) {
      const payload = formatAiringPushBody(item);
      const r = await sendPushToAll({
        title: payload.title,
        body: payload.body,
        url: payload.url,
        tag: `airing-${item.anilistId}-${item.episode}`,
      });
      results.push({ title: payload.title, ...r });
    }
  } else {
    const first = items[0];
    const extra =
      items.length > 1 ? ` (+${items.length - 1} more in window)` : "";
    const payload = formatAiringPushBody(first);
    const r = await sendPushToAll({
      title: "Airing soon",
      body: `${payload.body}${extra}`,
      url: "/airing",
      tag: "airing-window",
    });
    results.push({ title: "Airing soon", ...r });
  }

  return NextResponse.json({
    ok: true,
    dry: false,
    count: items.length,
    items: items.map((i) => ({
      id: i.anilistId,
      title: i.title,
      episode: i.episode,
      minutesFromNow: i.minutesFromNow,
    })),
    push: results,
  });
}
