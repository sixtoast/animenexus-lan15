import { NextResponse } from "next/server";
import {
  clearMalTokenCookies,
  getMalAccessToken,
  isMalOAuthConfigured,
  malApiGet,
} from "@/lib/mal-oauth";

export const runtime = "nodejs";

export async function GET() {
  const configured = isMalOAuthConfigured();
  if (!configured) {
    return NextResponse.json({
      configured: false,
      connected: false,
      username: null,
    });
  }

  const token = await getMalAccessToken();
  if (!token) {
    return NextResponse.json({
      configured: true,
      connected: false,
      username: null,
    });
  }

  try {
    const me = await malApiGet<{ name?: string; id?: number }>("/users/@me");
    return NextResponse.json({
      configured: true,
      connected: true,
      username: me?.name || null,
      userId: me?.id || null,
    });
  } catch {
    return NextResponse.json({
      configured: true,
      connected: true,
      username: null,
    });
  }
}

export async function DELETE() {
  await clearMalTokenCookies();
  return NextResponse.json({ ok: true, connected: false });
}
