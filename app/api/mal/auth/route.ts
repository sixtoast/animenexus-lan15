import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import {
  buildMalAuthorizeUrl,
  generateOAuthState,
  generatePkceVerifier,
  isMalOAuthConfigured,
  malClientId,
  malRedirectUri,
  MAL_COOKIE_STATE,
  MAL_COOKIE_VERIFIER,
} from "@/lib/mal-oauth";

export const runtime = "nodejs";

export async function GET() {
  if (!isMalOAuthConfigured()) {
    return NextResponse.json(
      {
        error:
          "MAL OAuth not configured. Set MAL_CLIENT_ID (and optional MAL_CLIENT_SECRET, MAL_REDIRECT_URI).",
      },
      { status: 503 },
    );
  }

  const clientId = malClientId();
  const redirectUri = malRedirectUri();
  const verifier = generatePkceVerifier();
  const state = generateOAuthState();

  const jar = await cookies();
  const cookieOpts = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: 600,
  };
  jar.set(MAL_COOKIE_VERIFIER, verifier, cookieOpts);
  jar.set(MAL_COOKIE_STATE, state, cookieOpts);

  const url = buildMalAuthorizeUrl({
    clientId,
    redirectUri,
    state,
    codeChallenge: verifier, // plain method — challenge === verifier
  });

  return NextResponse.redirect(url);
}
