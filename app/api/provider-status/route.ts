import { NextRequest, NextResponse } from "next/server";
import { getOptionalProviderStatus } from "@/lib/provider-status";
import { runLiveHealthProbes } from "@/lib/api-live-health";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const live =
    req.nextUrl.searchParams.get("live") === "1" ||
    req.nextUrl.searchParams.get("live") === "true";

  const body: Record<string, unknown> = {
    providers: getOptionalProviderStatus(),
  };

  if (live) {
    const origin = req.nextUrl.origin;
    const health = await runLiveHealthProbes({ origin });
    body.live = health.probes;
    body.checkedAt = health.checkedAt;
  }

  return NextResponse.json(body, {
    headers: {
      "Cache-Control": "no-store",
    },
  });
}
