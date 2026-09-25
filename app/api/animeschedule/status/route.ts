import { NextResponse } from "next/server";
import {
  clearAnimeScheduleTokenCookies,
  fetchAnimeScheduleViewer,
  getAnimeScheduleAccessToken,
  isAnimeScheduleOAuthConfigured,
  revokeAnimeScheduleAccessToken,
} from "@/lib/animeschedule-oauth";

export const runtime = "nodejs";

export async function GET() {
  if (!isAnimeScheduleOAuthConfigured()) {
    return NextResponse.json({ configured: false, connected: false, username: null, userId: null });
  }

  const token = await getAnimeScheduleAccessToken();
  if (!token) {
    return NextResponse.json({ configured: true, connected: false, username: null, userId: null });
  }

  const viewer = await fetchAnimeScheduleViewer(token);
  if (!viewer) {
    await clearAnimeScheduleTokenCookies();
    return NextResponse.json({ configured: true, connected: false, username: null, userId: null });
  }

  return NextResponse.json({
    configured: true,
    connected: true,
    username: viewer.username,
    userId: viewer.userId,
  });
}

export async function DELETE() {
  const token = await getAnimeScheduleAccessToken();
  if (token) await revokeAnimeScheduleAccessToken(token);
  await clearAnimeScheduleTokenCookies();
  return NextResponse.json({ ok: true, connected: false });
}
