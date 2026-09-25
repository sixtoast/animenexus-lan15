/**
 * AnimeSchedule.net OAuth 2.0 authorization-code flow with PKCE.
 * API v3: https://img.animeschedule.net/api/v3/documentation
 */
import { cookies } from "next/headers";

const AUTH_URL = "https://animeschedule.net/api/v3/oauth2/authorize";
const TOKEN_URL = "https://animeschedule.net/api/v3/oauth2/token";
const REVOKE_URL = "https://animeschedule.net/api/v3/oauth2/revoke";
const API_BASE = "https://animeschedule.net/api/v3";

export const AS_COOKIE_ACCESS = "animeschedule_access_token";
export const AS_COOKIE_REFRESH = "animeschedule_refresh_token";
export const AS_COOKIE_EXPIRES = "animeschedule_token_expires";
export const AS_COOKIE_VERIFIER = "animeschedule_pkce_verifier";
export const AS_COOKIE_STATE = "animeschedule_oauth_state";

export function cleanEnv(value: string | undefined): string {
  if (!value) return "";
  let v = value.trim();
  if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
    v = v.slice(1, -1).trim();
  }
  return v;
}

export function isAnimeScheduleOAuthConfigured(): boolean {
  return Boolean(
    cleanEnv(process.env.ANIMESCHEDULE_CLIENT_ID) &&
      cleanEnv(process.env.ANIMESCHEDULE_REDIRECT_URI),
  );
}

export function animeScheduleClientId(): string {
  return cleanEnv(process.env.ANIMESCHEDULE_CLIENT_ID);
}

export function animeScheduleClientSecret(): string | undefined {
  const value = cleanEnv(process.env.ANIMESCHEDULE_CLIENT_SECRET);
  return value || undefined;
}

export function animeScheduleRedirectUri(): string {
  return (
    cleanEnv(process.env.ANIMESCHEDULE_REDIRECT_URI) ||
    "http://localhost:3000/api/animeschedule/callback"
  );
}

/** Optional because scopes are selected on the AnimeSchedule application itself. */
export function animeScheduleScope(): string | undefined {
  const value = cleanEnv(process.env.ANIMESCHEDULE_SCOPE);
  return value || undefined;
}

export function generatePkceVerifier(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~";
  const bytes = new Uint8Array(64);
  if (typeof crypto !== "undefined" && crypto.getRandomValues) {
    crypto.getRandomValues(bytes);
  } else {
    for (let i = 0; i < bytes.length; i++) bytes[i] = Math.floor(Math.random() * 256);
  }
  return Array.from(bytes, (b) => chars[b % chars.length]).join("");
}

export function generateOAuthState(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  const bytes = new Uint8Array(32);
  if (typeof crypto !== "undefined" && crypto.getRandomValues) {
    crypto.getRandomValues(bytes);
  } else {
    for (let i = 0; i < bytes.length; i++) bytes[i] = Math.floor(Math.random() * 256);
  }
  return Array.from(bytes, (b) => chars[b % chars.length]).join("");
}

async function sha256Base64Url(value: string): Promise<string> {
  const data = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", data);
  const bytes = new Uint8Array(digest);
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\\+/g, "-").replace(/\\//g, "_").replace(/=+$/g, "");
}

export async function buildAnimeScheduleAuthorizeUrl(opts: {
  clientId: string;
  redirectUri: string;
  state: string;
  codeVerifier: string;
  scope?: string;
}): Promise<string> {
  const codeChallenge = await sha256Base64Url(opts.codeVerifier);
  const q = new URLSearchParams({
    response_type: "code",
    client_id: opts.clientId,
    redirect_uri: opts.redirectUri,
    state: opts.state,
    code_challenge: codeChallenge,
    code_challenge_method: "S256",
  });
  if (opts.scope) q.set("scope", opts.scope);
  return `${AUTH_URL}?${q.toString()}`;
}

export type AnimeScheduleTokenResponse = {
  access_token: string;
  token_type?: string;
  expires_in?: number;
  refresh_token?: string;
  scope?: string;
};

export async function exchangeAnimeScheduleCode(opts: {
  code: string;
  codeVerifier: string;
  clientId: string;
  clientSecret?: string;
  redirectUri: string;
}): Promise<AnimeScheduleTokenResponse> {
  const body = new URLSearchParams({
    grant_type: "authorization_code",
    client_id: opts.clientId.trim(),
    code: opts.code.trim(),
    redirect_uri: opts.redirectUri.trim(),
    code_verifier: opts.codeVerifier,
  });
  if (opts.clientSecret) body.set("client_secret", opts.clientSecret.trim());

  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded", Accept: "application/json" },
    body,
    cache: "no-store",
  });
  if (!res.ok) {
    const text = await res.text();
    let detail = text.slice(0, 240);
    try {
      const json = JSON.parse(text) as { error?: string; error_description?: string; message?: string };
      detail = [json.error, json.error_description || json.message].filter(Boolean).join(": ") || detail;
    } catch {
      /* keep response text */
    }
    throw new Error(`AnimeSchedule OAuth token exchange failed: ${detail}`);
  }
  return (await res.json()) as AnimeScheduleTokenResponse;
}

const COOKIE_BASE = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/",
};

export async function setAnimeScheduleTokenCookies(tokens: AnimeScheduleTokenResponse): Promise<void> {
  const jar = await cookies();
  const expiresIn = Math.max(60, Number(tokens.expires_in || 3600));
  const expiresAt = Date.now() + expiresIn * 1000;
  const accessMaxAge = Math.min(Math.max(expiresIn, 60), 60 * 60 * 24 * 30);

  jar.set(AS_COOKIE_ACCESS, tokens.access_token, { ...COOKIE_BASE, maxAge: accessMaxAge });
  jar.set(AS_COOKIE_EXPIRES, String(expiresAt), { ...COOKIE_BASE, maxAge: 60 * 60 * 24 * 30 });
  if (tokens.refresh_token) {
    jar.set(AS_COOKIE_REFRESH, tokens.refresh_token, { ...COOKIE_BASE, maxAge: 60 * 60 * 24 * 180 });
  }
}

export async function clearAnimeScheduleTokenCookies(): Promise<void> {
  const jar = await cookies();
  for (const name of [AS_COOKIE_ACCESS, AS_COOKIE_REFRESH, AS_COOKIE_EXPIRES, AS_COOKIE_VERIFIER, AS_COOKIE_STATE]) {
    jar.set(name, "", { ...COOKIE_BASE, maxAge: 0 });
  }
}

async function refreshAnimeScheduleToken(refreshToken: string): Promise<AnimeScheduleTokenResponse> {
  const body = new URLSearchParams({
    grant_type: "refresh_token",
    client_id: animeScheduleClientId(),
    refresh_token: refreshToken,
  });
  const secret = animeScheduleClientSecret();
  if (secret) body.set("client_secret", secret);

  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded", Accept: "application/json" },
    body,
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`AnimeSchedule token refresh failed: ${res.status}`);
  return (await res.json()) as AnimeScheduleTokenResponse;
}

export async function getAnimeScheduleAccessToken(): Promise<string | null> {
  if (!isAnimeScheduleOAuthConfigured()) return null;
  const jar = await cookies();
  const access = jar.get(AS_COOKIE_ACCESS)?.value;
  const refresh = jar.get(AS_COOKIE_REFRESH)?.value;
  const expiresAt = Number(jar.get(AS_COOKIE_EXPIRES)?.value || 0);

  if (access && expiresAt > Date.now() + 60_000) return access;
  if (!refresh) return access || null;

  try {
    const tokens = await refreshAnimeScheduleToken(refresh);
    await setAnimeScheduleTokenCookies(tokens);
    return tokens.access_token;
  } catch {
    return null;
  }
}

export type AnimeScheduleViewer = {
  userId: string | number | null;
  username: string | null;
};

export async function fetchAnimeScheduleViewer(accessToken: string): Promise<AnimeScheduleViewer | null> {
  const res = await fetch(`${API_BASE}/animelists/oauth`, {
    headers: { Authorization: `Bearer ${accessToken}`, Accept: "application/json" },
    cache: "no-store",
  });
  if (!res.ok) return null;
  const json = (await res.json()) as {
    userID?: string | number;
    userId?: string | number;
    username?: string;
  };
  return {
    userId: json.userID ?? json.userId ?? null,
    username: json.username || null,
  };
}

export async function revokeAnimeScheduleAccessToken(accessToken: string): Promise<void> {
  const body = new URLSearchParams({ token: accessToken, client_id: animeScheduleClientId() });
  const secret = animeScheduleClientSecret();
  if (secret) body.set("client_secret", secret);
  try {
    await fetch(REVOKE_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded", Accept: "application/json" },
      body,
      cache: "no-store",
    });
  } catch {
    /* Local disconnect still clears the credentials. */
  }
}
