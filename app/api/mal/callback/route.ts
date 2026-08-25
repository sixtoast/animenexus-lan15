import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import {
  clearMalTokenCookies,
  exchangeMalCode,
  isMalOAuthConfigured,
  malRedirectUri,
  MAL_COOKIE_STATE,
  MAL_COOKIE_VERIFIER,
  setMalTokenCookies,
} from "@/lib/mal-oauth";

export const runtime = "nodejs";

function accountRedirect(query: Record<string, string>) {
  const base =
    process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ||
    process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : "http://localhost:3000";
  const u = new URL("/account", base);
  for (const [k, v] of Object.entries(query)) u.searchParams.set(k, v);
  return NextResponse.redirect(u.toString());
}

export async function GET(req: NextRequest) {
  if (!isMalOAuthConfigured()) {
    return accountRedirect({ mal: "not_configured" });
  }

  const code = req.nextUrl.searchParams.get("code");
  const state = req.nextUrl.searchParams.get("state");
  const err = req.nextUrl.searchParams.get("error");

  if (err) {
    return accountRedirect({ mal: "denied", reason: err });
  }
  if (!code) {
    return accountRedirect({ mal: "error", reason: "missing_code" });
  }

  const jar = await cookies();
  const savedState = jar.get(MAL_COOKIE_STATE)?.value;
  const verifier = jar.get(MAL_COOKIE_VERIFIER)?.value;

  if (!verifier || !savedState || state !== savedState) {
    return accountRedirect({ mal: "error", reason: "state_mismatch" });
  }

  try {
    const tokens = await exchangeMalCode({
      code,
      codeVerifier: verifier,
      clientId: process.env.MAL_CLIENT_ID!.trim(),
      clientSecret: process.env.MAL_CLIENT_SECRET?.trim(),
      redirectUri: malRedirectUri(),
    });
    await setMalTokenCookies(tokens);
    // Clear PKCE cookies
    jar.set(MAL_COOKIE_VERIFIER, "", { path: "/", maxAge: 0 });
    jar.set(MAL_COOKIE_STATE, "", { path: "/", maxAge: 0 });
    return accountRedirect({ mal: "connected" });
  } catch (e) {
    await clearMalTokenCookies();
    return accountRedirect({
      mal: "error",
      reason: e instanceof Error ? e.message.slice(0, 80) : "exchange_failed",
    });
  }
}
