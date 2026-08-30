import type { AniListUserProfile } from "./anilist-user";

export const SESSION_KEY = "animenexus.session.v1";
export const REMEMBER_KEY = "animenexus.session.remember.v1";

export type SessionAuthMode = "quick" | "oauth";

export type SessionState = {
  username: string;
  userId: number;
  avatar?: string;
  bannerImage?: string;
  connectedAt: string;
  lastSyncAt?: string;
  lastSyncCount?: number;
  /** quick = public username only; oauth = authorized token on server */
  authMode?: SessionAuthMode;
  /** Persist across browser restarts when true */
  remember?: boolean;
};

function storageFor(remember: boolean): Storage | null {
  if (typeof window === "undefined") return null;
  try {
    return remember ? localStorage : sessionStorage;
  } catch {
    return null;
  }
}

export function getRememberPreference(): boolean {
  if (typeof window === "undefined") return true;
  try {
    const v = localStorage.getItem(REMEMBER_KEY);
    if (v === "0") return false;
    if (v === "1") return true;
  } catch {
    /* */
  }
  return true;
}

export function setRememberPreference(remember: boolean) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(REMEMBER_KEY, remember ? "1" : "0");
  } catch {
    /* */
  }
}

export function readSession(): SessionState | null {
  if (typeof window === "undefined") return null;
  try {
    // Prefer durable session, then tab session
    const raw =
      localStorage.getItem(SESSION_KEY) || sessionStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as SessionState;
    if (!parsed?.username || !parsed?.userId) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function writeSession(session: SessionState | null) {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(SESSION_KEY);
    sessionStorage.removeItem(SESSION_KEY);
  } catch {
    /* */
  }
  if (!session) return;
  const remember = session.remember !== false;
  setRememberPreference(remember);
  const store = storageFor(remember);
  if (!store) return;
  try {
    store.setItem(SESSION_KEY, JSON.stringify({ ...session, remember }));
  } catch {
    /* private mode */
  }
}

export function profileToSession(
  profile: AniListUserProfile,
  prev?: SessionState | null,
  authMode: SessionAuthMode = "quick",
  remember = true,
): SessionState {
  return {
    username: profile.name,
    userId: profile.id,
    avatar: profile.avatar,
    bannerImage: profile.bannerImage,
    connectedAt: prev?.connectedAt || new Date().toISOString(),
    lastSyncAt: prev?.lastSyncAt,
    lastSyncCount: prev?.lastSyncCount,
    authMode,
    remember,
  };
}
