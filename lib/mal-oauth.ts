/**
 * MyAnimeList OAuth 2.0 + PKCE (plain method only).
 * Docs: https://myanimelist.net/apiconfig/references/authorization
 */

import { cookies } from "next/headers";

const AUTH_URL = "https://myanimelist.net/v1/oauth2/authorize";
const TOKEN_URL = "https://myanimelist.net/v1/oauth2/token";
const API_BASE = "https://api.myanimelist.net/v2";

export const MAL_COOKIE_ACCESS = "mal_access_token";
export const MAL_COOKIE_REFRESH = "mal_refresh_token";
export const MAL_COOKIE_EXPIRES = "mal_token_expires";
export const MAL_COOKIE_VERIFIER = "mal_pkce_verifier";
export const MAL_COOKIE_STATE = "mal_oauth_state";

export function isMalOAuthConfigured(): boolean {
  return Boolean(process.env.MAL_CLIENT_ID?.trim());
}

export function malRedirectUri(): string {
  return (
    process.env.MAL_REDIRECT_URI?.trim() ||
    "http://localhost:3000/api/mal/callback"
  );
}

/** PKCE code_verifier: 43–128 chars [A-Za-z0-9-._~] */
export function generatePkceVerifier(): string {
  const chars =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~";
  const len = 128;
  const bytes = new Uint8Array(len);
  if (typeof crypto !== "undefined" && crypto.getRandomValues) {
    crypto.getRandomValues(bytes);
  } else {
    for (let i = 0; i < len; i++) bytes[i] = Math.floor(Math.random() * 256);
  }
  let out = "";
  for (let i = 0; i < len; i++) out += chars[bytes[i] % chars.length];
  return out;
}

export function generateOAuthState(): string {
  return generatePkceVerifier().slice(0, 32);
}

export function buildMalAuthorizeUrl(opts: {
  clientId: string;
  redirectUri: string;
  state: string;
  codeChallenge: string;
}): string {
  const q = new URLSearchParams({
    response_type: "code",
    client_id: opts.clientId,
    redirect_uri: opts.redirectUri,
    code_challenge: opts.codeChallenge,
    code_challenge_method: "plain",
    state: opts.state,
  });
  return `${AUTH_URL}?${q}`;
}

export type MalTokenResponse = {
  token_type: string;
  expires_in: number;
  access_token: string;
  refresh_token: string;
};

export async function exchangeMalCode(opts: {
  code: string;
  codeVerifier: string;
  clientId: string;
  clientSecret?: string;
  redirectUri: string;
}): Promise<MalTokenResponse> {
  const body = new URLSearchParams({
    client_id: opts.clientId,
    grant_type: "authorization_code",
    code: opts.code,
    redirect_uri: opts.redirectUri,
    code_verifier: opts.codeVerifier,
  });
  if (opts.clientSecret) body.set("client_secret", opts.clientSecret);

  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`MAL token exchange failed: ${res.status} ${text.slice(0, 200)}`);
  }
  return (await res.json()) as MalTokenResponse;
}

export async function refreshMalToken(opts: {
  refreshToken: string;
  clientId: string;
  clientSecret?: string;
}): Promise<MalTokenResponse> {
  const body = new URLSearchParams({
    client_id: opts.clientId,
    grant_type: "refresh_token",
    refresh_token: opts.refreshToken,
  });
  if (opts.clientSecret) body.set("client_secret", opts.clientSecret);

  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`MAL refresh failed: ${res.status} ${text.slice(0, 200)}`);
  }
  return (await res.json()) as MalTokenResponse;
}

const COOKIE_BASE = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/",
};

export async function setMalTokenCookies(tokens: MalTokenResponse) {
  const jar = await cookies();
  const maxAge = Math.max(60, tokens.expires_in || 3600);
  const expiresAt = Date.now() + maxAge * 1000;
  jar.set(MAL_COOKIE_ACCESS, tokens.access_token, {
    ...COOKIE_BASE,
    maxAge: 60 * 60 * 24 * 30,
  });
  jar.set(MAL_COOKIE_REFRESH, tokens.refresh_token, {
    ...COOKIE_BASE,
    maxAge: 60 * 60 * 24 * 90,
  });
  jar.set(MAL_COOKIE_EXPIRES, String(expiresAt), {
    ...COOKIE_BASE,
    maxAge: 60 * 60 * 24 * 30,
  });
}

export async function clearMalTokenCookies() {
  const jar = await cookies();
  for (const name of [
    MAL_COOKIE_ACCESS,
    MAL_COOKIE_REFRESH,
    MAL_COOKIE_EXPIRES,
    MAL_COOKIE_VERIFIER,
    MAL_COOKIE_STATE,
  ]) {
    jar.set(name, "", { ...COOKIE_BASE, maxAge: 0 });
  }
}

/** Valid access token, refreshing if needed. */
export async function getMalAccessToken(): Promise<string | null> {
  if (!isMalOAuthConfigured()) return null;
  const jar = await cookies();
  const access = jar.get(MAL_COOKIE_ACCESS)?.value;
  const refresh = jar.get(MAL_COOKIE_REFRESH)?.value;
  const expires = parseInt(jar.get(MAL_COOKIE_EXPIRES)?.value || "0", 10);
  if (access && expires > Date.now() + 60_000) return access;
  if (!refresh) return access || null;

  try {
    const clientId = process.env.MAL_CLIENT_ID!.trim();
    const clientSecret = process.env.MAL_CLIENT_SECRET?.trim();
    const tokens = await refreshMalToken({
      refreshToken: refresh,
      clientId,
      clientSecret,
    });
    await setMalTokenCookies(tokens);
    return tokens.access_token;
  } catch {
    return access || null;
  }
}

export async function malApiGet<T>(path: string): Promise<T | null> {
  const token = await getMalAccessToken();
  if (!token) return null;
  const res = await fetch(`${API_BASE}${path}`, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/json",
    },
  });
  if (res.status === 401) return null;
  if (!res.ok) throw new Error(`MAL API ${res.status}`);
  return (await res.json()) as T;
}

/** Map AnimeNexus status → MAL list status string */
export function toMalListStatus(
  status?: string,
): string | undefined {
  if (!status) return undefined;
  const map: Record<string, string> = {
    watching: "watching",
    completed: "completed",
    planning: "plan_to_watch",
    paused: "on_hold",
    dropped: "dropped",
  };
  return map[status] || undefined;
}

export async function malUpdateAnimeList(opts: {
  malId: number;
  status?: string;
  progress?: number;
  score?: number;
}): Promise<boolean> {
  const token = await getMalAccessToken();
  if (!token) return false;

  const body = new URLSearchParams();
  const st = toMalListStatus(opts.status);
  if (st) body.set("status", st);
  if (opts.progress != null) body.set("num_watched_episodes", String(opts.progress));
  if (opts.score != null && opts.score > 0) body.set("score", String(Math.round(opts.score)));

  if (![...body.keys()].length) return true;

  const res = await fetch(`${API_BASE}/anime/${opts.malId}/my_list_status`, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body,
  });
  return res.ok;
}
