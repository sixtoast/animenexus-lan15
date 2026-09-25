import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import {
  animeScheduleClientId,
  animeScheduleRedirectUri,
  animeScheduleScope,
  AS_COOKIE_STATE,
  AS_COOKIE_VERIFIER,
  buildAnimeScheduleAuthorizeUrl,
  generateOAuthState,
  generatePkceVerifier,
  isAnimeScheduleOAuthConfigured,
} from "@/lib/animeschedule-oauth";

export const runtime = "nodejs";

export async function GET() {
  if (!isAnimeScheduleOAuthConfigured()) {
    return NextResponse.json(
      { error: "AnimeSchedule OAuth not configured. Set ANIMESCHEDULE_CLIENT_ID and ANIMESCHEDULE_REDIRECT_URI." },
      { status: 503 },
    );
  }

  const state = generateOAuthState();
  const verifier = generatePkceVerifier();
  const jar = await cookies();
  const cookieOpts = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: 600,
  };
  jar.set(AS_COOKIE_STATE, state, cookieOpts);
  jar.set(AS_COOKIE_VERIFIER, verifier, cookieOpts);

  const url = await buildAnimeScheduleAuthorizeUrl({
    clientId: animeScheduleClientId(),
    redirectUri: animeScheduleRedirectUri(),
    state,
    codeVerifier: verifier,
    scope: animeScheduleScope(),
  });

  return NextResponse.redirect(url);
}
