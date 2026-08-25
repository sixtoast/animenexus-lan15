import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import {
  AL_COOKIE_STATE,
  anilistClientId,
  anilistRedirectUri,
  buildAniListAuthorizeUrl,
  generateState,
  isAniListOAuthConfigured,
} from "@/lib/anilist-oauth";

export const runtime = "nodejs";

export async function GET() {
  if (!isAniListOAuthConfigured()) {
    return NextResponse.json(
      {
        error:
          "AniList OAuth not configured. Set ANILIST_CLIENT_ID, ANILIST_CLIENT_SECRET, ANILIST_REDIRECT_URI.",
      },
      { status: 503 },
    );
  }

  const state = generateState();
  const jar = await cookies();
  jar.set(AL_COOKIE_STATE, state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 600,
  });

  const url = buildAniListAuthorizeUrl({
    clientId: anilistClientId(),
    redirectUri: anilistRedirectUri(),
    state,
  });

  return NextResponse.redirect(url);
}
