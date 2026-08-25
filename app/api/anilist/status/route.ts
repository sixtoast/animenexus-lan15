import { NextResponse } from "next/server";
import {
  clearAniListTokenCookies,
  fetchAniListViewer,
  getAniListAccessToken,
  isAniListOAuthConfigured,
} from "@/lib/anilist-oauth";

export const runtime = "nodejs";

export async function GET() {
  const configured = isAniListOAuthConfigured();
  if (!configured) {
    return NextResponse.json({
      configured: false,
      connected: false,
      username: null,
      userId: null,
      avatar: null,
    });
  }

  const token = await getAniListAccessToken();
  if (!token) {
    return NextResponse.json({
      configured: true,
      connected: false,
      username: null,
      userId: null,
      avatar: null,
    });
  }

  const viewer = await fetchAniListViewer(token);
  return NextResponse.json({
    configured: true,
    connected: Boolean(viewer),
    username: viewer?.name || null,
    userId: viewer?.id || null,
    avatar: viewer?.avatar || null,
  });
}

export async function DELETE() {
  await clearAniListTokenCookies();
  return NextResponse.json({ ok: true, connected: false });
}
