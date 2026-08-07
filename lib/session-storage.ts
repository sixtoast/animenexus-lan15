import type { AniListUserProfile } from "./anilist-user";

export const SESSION_KEY = "animenexus.session.v1";

export type SessionState = {
  username: string;
  userId: number;
  avatar?: string;
  bannerImage?: string;
  connectedAt: string;
  lastSyncAt?: string;
  lastSyncCount?: number;
};

export function readSession(): SessionState | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(SESSION_KEY);
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
  if (!session) {
    localStorage.removeItem(SESSION_KEY);
    return;
  }
  localStorage.setItem(SESSION_KEY, JSON.stringify(session));
}

export function profileToSession(
  profile: AniListUserProfile,
  prev?: SessionState | null,
): SessionState {
  return {
    username: profile.name,
    userId: profile.id,
    avatar: profile.avatar,
    bannerImage: profile.bannerImage,
    connectedAt: prev?.connectedAt || new Date().toISOString(),
    lastSyncAt: prev?.lastSyncAt,
    lastSyncCount: prev?.lastSyncCount,
  };
}
