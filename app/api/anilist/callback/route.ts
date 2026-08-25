import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import {
  AL_COOKIE_STATE,
  anilistClientId,
  anilistClientSecret,
  anilistRedirectUri,
  clearAniListTokenCookies,
  exchangeAniListCode,
  fetchAniListViewer,
  isAniListOAuthConfigured,
  setAniListTokenCookie,
} from "@/lib/anilist-oauth";

export const runtime = "nodejs";

function accountRedirect(query: Record<string, string>) {
  const base = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "")
    ? process.env.NEXT_PUBLIC_SITE_URL.replace(/\/$/, "")
    : process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : "http://localhost:3000";
  const u = new URL("/account", base);
  for (const [k, v] of Object.entries(query)) u.searchParams.set(k, v);
  return NextResponse.redirect(u.toString());
}

export async function GET(req: NextRequest) {
  if (!isAniListOAuthConfigured()) {
    return accountRedirect({ anilist: "not_configured" });
  }

  const code = req.nextUrl.searchParams.get("code");
  const state = req.nextUrl.searchParams.get("state");
  const err = req.nextUrl.searchParams.get("error");

  if (err) {
    return accountRedirect({ anilist: "denied", reason: err });
  }
  if (!code) {
    return accountRedirect({ anilist: "error", reason: "missing_code" });
  }

  const jar = await cookies();
  const savedState = jar.get(AL_COOKIE_STATE)?.value;
  if (savedState && state && state !== savedState) {
    return accountRedirect({ anilist: "error", reason: "state_mismatch" });
  }

  try {
    const tokens = await exchangeAniListCode({
      code,
      clientId: anilistClientId(),
      clientSecret: anilistClientSecret(),
      redirectUri: anilistRedirectUri(),
    });
    await setAniListTokenCookie(tokens.access_token);
    jar.set(AL_COOKIE_STATE, "", { path: "/", maxAge: 0 });

    const viewer = await fetchAniListViewer(tokens.access_token);
    return accountRedirect({
      anilist: "connected",
      user: viewer?.name || "",
      uid: viewer ? String(viewer.id) : "",
      avatar: viewer?.avatar || "",
    });
  } catch (e) {
    await clearAniListTokenCookies();
    return accountRedirect({
      anilist: "error",
      reason: e instanceof Error ? e.message.slice(0, 120) : "exchange_failed",
    });
  }
}
