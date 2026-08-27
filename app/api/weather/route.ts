import { NextRequest, NextResponse } from "next/server";
import { fetchOpenMeteoCurrent } from "@/lib/providers/open-meteo";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Opt-in weather — client supplies lat/lon. Soft-fail JSON. */
export async function GET(req: NextRequest) {
  const lat = parseFloat(req.nextUrl.searchParams.get("lat") || "");
  const lon = parseFloat(req.nextUrl.searchParams.get("lon") || "");
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
    return NextResponse.json(
      { error: "lat and lon required" },
      { status: 400 },
    );
  }
  const snap = await fetchOpenMeteoCurrent(lat, lon);
  if (!snap) {
    return NextResponse.json({ weather: null, offline: true });
  }
  return NextResponse.json({ weather: snap });
}
