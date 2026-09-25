import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import {
  animeScheduleClientId,
  animeScheduleClientSecret,
  animeScheduleRedirectUri,
  AS_COOKIE_STATE,
  AS_COOKIE_VERIFIER,
  clearAnimeScheduleTokenCookies,
  exchangeAnimeScheduleCode,
  isAnimeScheduleOAuthConfigured,
  setAnimeScheduleTokenCookies,
} from "@/lib/animeschedule-oauth";

export const runtime = "nodejs";

function accountRedirect(query: Record<string, string>) {
  const site = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "");
  const base = site ? site : process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000";
  const url = new URL("/account", base);
  for (const [key, value] of Object.entries(query)) url.searchParams.set(key, value);
  return NextResponse.redirect(url.toString());
}

export async function GET(req: NextRequest) {
  if (!isAnimeScheduleOAuthConfigured()) return accountRedirect({ animeschedule: "not_configured" });

  const code = req.nextUrl.searchParams.get("code");
  const state = req.nextUrl.searchParams.get("state");
  const error = req.nextUrl.searchParams.get("error");
  if (error) return accountRedirect({ animeschedule: "denied", reason: error });
  if (!code) return accountRedirect({ animeschedule: "error", reason: "missing_code" });

  const jar = await cookies();
  const savedState = jar.get(AS_COOKIE_STATE)?.value;
  const verifier = jar.get(AS_COOKIE_VERIFIER)?.value;
  if (!savedState || !verifier) {
    return accountRedirect({ animeschedule: "error", reason: "missing_oauth_cookie — start Connect again in the same browser" });
  }
  if (state !== savedState) {
    await clearAnimeScheduleTokenCookies();
    return accountRedirect({ animeschedule: "error", reason: "state_mismatch — start Connect again" });
  }

  try {
    const tokens = await exchangeAnimeScheduleCode({
      code,
      codeVerifier: verifier,
      clientId: animeScheduleClientId(),
      clientSecret: animeScheduleClientSecret(),
      redirectUri: animeScheduleRedirectUri(),
    });
    await setAnimeScheduleTokenCookies(tokens);
    jar.set(AS_COOKIE_STATE, "", { path: "/", maxAge: 0 });
    jar.set(AS_COOKIE_VERIFIER, "", { path: "/", maxAge: 0 });
    return accountRedirect({ animeschedule: "connected" });
  } catch (e) {
    await clearAnimeScheduleTokenCookies();
    return accountRedirect({
      animeschedule: "error",
      reason: e instanceof Error ? e.message.slice(0, 180) : "exchange_failed",
    });
  }
}
