"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { fetchUserAnimeList, fetchUserByName } from "@/lib/anilist-user";
import {
  getRememberPreference,
  profileToSession,
  readSession,
  writeSession,
  type SessionState,
} from "@/lib/session-storage";
import type { WatchlistEntry } from "@/lib/types";
import { readWatchlist, writeWatchlist } from "@/lib/watchlist-storage";

type Ctx = {
  session: SessionState | null;
  ready: boolean;
  connecting: boolean;
  syncing: boolean;
  error: string | null;
  connectQuick: (username: string, remember?: boolean) => Promise<void>;
  applyOAuthSession: (
    profile: { username: string; userId: number; avatar?: string },
    remember?: boolean,
  ) => void;
  disconnect: () => void;
  syncLists: () => Promise<number>;
  clearError: () => void;
};

const SessionContext = createContext<Ctx | null>(null);

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<SessionState | null>(null);
  const [ready, setReady] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setSession(readSession());
    setReady(true);
  }, []);

  const connectQuick = useCallback(async (username: string, remember = true) => {
    const name = username.trim().replace(/^@/, "");
    if (!name) {
      setError("Enter an AniList username.");
      return;
    }
    setConnecting(true);
    setError(null);
    try {
      const profile = await fetchUserByName(name);
      if (!profile) {
        setError(`No public AniList user named “${name}”.`);
        return;
      }
      const next = profileToSession(profile, null, "quick", remember);
      writeSession(next);
      setSession(next);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not reach AniList");
    } finally {
      setConnecting(false);
    }
  }, []);

  const applyOAuthSession = useCallback(
    (
      profile: { username: string; userId: number; avatar?: string },
      remember = getRememberPreference(),
    ) => {
      const next: SessionState = {
        username: profile.username,
        userId: profile.userId,
        avatar: profile.avatar,
        connectedAt: new Date().toISOString(),
        authMode: "oauth",
        remember,
      };
      writeSession(next);
      setSession(next);
      setError(null);
    },
    [],
  );

  const disconnect = useCallback(() => {
    writeSession(null);
    setSession(null);
    setError(null);
    void fetch("/api/anilist/status", { method: "DELETE" }).catch(() => null);
    void fetch("/api/mal/status", { method: "DELETE" }).catch(() => null);
  }, []);

  const syncLists = useCallback(async () => {
    const current = readSession();
    if (!current?.username) {
      setError("Connect an AniList account first.");
      return 0;
    }
    setSyncing(true);
    setError(null);
    try {
      const remote = await fetchUserAnimeList(current.username);
      const local = readWatchlist();
      const localById = new Map(local.map((e) => [e.id, e]));
      const merged: WatchlistEntry[] = [];
      const seen = new Set<number>();

      for (const r of remote) {
        seen.add(r.id);
        const prev = localById.get(r.id);
        merged.push({
          ...r,
          notes: prev?.notes || r.notes || "",
          userRating: r.userRating || prev?.userRating || 0,
        });
      }
      for (const e of local) {
        if (!seen.has(e.id)) merged.push(e);
      }

      writeWatchlist(merged);
      window.dispatchEvent(new CustomEvent("animenexus:watchlist-synced"));

      const next: SessionState = {
        ...current,
        lastSyncAt: new Date().toISOString(),
        lastSyncCount: remote.length,
        remember: current.remember !== false,
      };
      writeSession(next);
      setSession(next);
      return remote.length;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Sync failed");
      return 0;
    } finally {
      setSyncing(false);
    }
  }, []);

  const clearError = useCallback(() => setError(null), []);

  const value = useMemo(
    () => ({
      session,
      ready,
      connecting,
      syncing,
      error,
      connectQuick,
      applyOAuthSession,
      disconnect,
      syncLists,
      clearError,
    }),
    [
      session,
      ready,
      connecting,
      syncing,
      error,
      connectQuick,
      applyOAuthSession,
      disconnect,
      syncLists,
      clearError,
    ],
  );

  return (
    <SessionContext.Provider value={value}>{children}</SessionContext.Provider>
  );
}

export function useSession() {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error("useSession must be used within SessionProvider");
  return ctx;
}
