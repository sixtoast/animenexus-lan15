import { NextResponse } from "next/server";
import { getOptionalProviderStatus } from "@/lib/provider-status";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Boolean config only — no secrets. */
export async function GET() {
  return NextResponse.json({
    providers: getOptionalProviderStatus(),
  });
}
