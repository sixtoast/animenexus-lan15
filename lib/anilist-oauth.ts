/**
 * AniList OAuth 2.0 — Authorization Code Grant
 * https://docs.anilist.co/guide/auth/authorization-code
 */

import { cookies } from "next/headers";

const AUTH_URL = "https://anilist.co/api/v2/oauth/authorize";
const TOKEN_URL = "https://anilist.co/api/v2/oauth/token";
const GRAPHQL = "https://graphql.anilist.co";

export const AL_COOKIE_ACCESS = "anilist_access_token";
export const AL_COOKIE_STATE = "anilist_oauth_state";

export function isAniListOAuthConfigured(): boolean {
  return Boolean(
    process.env.ANILIST_CLIENT_ID?.trim() &&
      process.env.ANILIST_CLIENT_SECRET?.trim(),
  );
}

export function anilistRedirectUri(): string {
  return (
    process.env.ANILIST_REDIRECT_URI?.trim() ||
    "http://localhost:3000/api/anilist/callback"
  );
}

export function generateState(): string {
  const chars =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  const bytes = new Uint8Array(24);
  if (typeof crypto !== "undefined" && crypto.getRandomValues) {
    crypto.getRandomValues(bytes);
  } else {
    for (let i = 0; i < 24; i++) bytes[i] = Math.floor(Math.random() * 256);
  }
  return Array.from(bytes, (b) => chars[b % chars.length]).join("");
}

export function buildAniListAuthorizeUrl(opts: {
  clientId: string;
  redirectUri: string;
  state?: string;
}): string {
  const q = new URLSearchParams({
    client_id: opts.clientId,
    redirect_uri: opts.redirectUri,
    response_type: "code",
  });
  if (opts.state) q.set("state", opts.state);
  return `${AUTH_URL}?${q}`;
}

export type AniListTokenResponse = {
  access_token: string;
  token_type?: string;
  expires_in?: number;
};

export async function exchangeAniListCode(opts: {
  code: string;
  clientId: string;
  clientSecret: string;
  redirectUri: string;
}): Promise<AniListTokenResponse> {
  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({
      grant_type: "authorization_code",
      client_id: opts.clientId,
      client_secret: opts.clientSecret,
      redirect_uri: opts.redirectUri,
      code: opts.code,
    }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(
      `AniList token exchange failed: ${res.status} ${text.slice(0, 200)}`,
    );
  }
  return (await res.json()) as AniListTokenResponse;
}

const COOKIE_BASE = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/",
};

export async function setAniListTokenCookie(accessToken: string) {
  const jar = await cookies();
  // AniList tokens last ~1 year
  jar.set(AL_COOKIE_ACCESS, accessToken, {
    ...COOKIE_BASE,
    maxAge: 60 * 60 * 24 * 365,
  });
}

export async function clearAniListTokenCookies() {
  const jar = await cookies();
  jar.set(AL_COOKIE_ACCESS, "", { ...COOKIE_BASE, maxAge: 0 });
  jar.set(AL_COOKIE_STATE, "", { ...COOKIE_BASE, maxAge: 0 });
}

export async function getAniListAccessToken(): Promise<string | null> {
  const jar = await cookies();
  return jar.get(AL_COOKIE_ACCESS)?.value || null;
}

export type AniListViewer = {
  id: number;
  name: string;
  avatar?: string;
};

export async function fetchAniListViewer(
  accessToken: string,
): Promise<AniListViewer | null> {
  const query = `
    query {
      Viewer {
        id
        name
        avatar { large medium }
      }
    }
  `;
  const res = await fetch(GRAPHQL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({ query }),
  });
  if (!res.ok) return null;
  const json = (await res.json()) as {
    data?: {
      Viewer?: {
        id?: number;
        name?: string;
        avatar?: { large?: string; medium?: string };
      };
    };
  };
  const v = json.data?.Viewer;
  if (!v?.id || !v.name) return null;
  return {
    id: v.id,
    name: v.name,
    avatar: v.avatar?.large || v.avatar?.medium,
  };
}
