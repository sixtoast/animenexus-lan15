"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import type { Anime, WatchStatus, WatchlistEntry } from "@/lib/types";
import {
  animeToEntry,
  readWatchlist,
  writeWatchlist,
} from "@/lib/watchlist-storage";
import { fireSeal } from "@/components/SealMoment";
import { recordCompletion } from "@/lib/lantern-memory";
import { emitNexus } from "@/lib/nexus";
import { markRecAccepted } from "@/lib/recommend-feedback";

type Ctx = {
  entries: WatchlistEntry[];
  ready: boolean;
  getEntry: (id: number) => WatchlistEntry | undefined;
  isInList: (id: number) => boolean;
  /** Returns false if persistence failed — do not show seal. */
  add: (anime: Anime, status?: WatchStatus) => boolean;
  remove: (id: number) => boolean;
  setStatus: (id: number, status: WatchStatus) => boolean;
  setProgress: (id: number, progress: number) => boolean;
  setUserRating: (id: number, rating: number) => boolean;
  clearAll: () => boolean;
  replaceAll: (entries: WatchlistEntry[]) => boolean;
};

const WatchlistContext = createContext<Ctx | null>(null);

export function WatchlistProvider({ children }: { children: React.ReactNode }) {
  const [entries, setEntries] = useState<WatchlistEntry[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setEntries(readWatchlist());
    setReady(true);
    const onSync = () => setEntries(readWatchlist());
    window.addEventListener("animenexus:watchlist-synced", onSync);
    window.addEventListener("storage", onSync);
    return () => {
      window.removeEventListener("animenexus:watchlist-synced", onSync);
      window.removeEventListener("storage", onSync);
    };
  }, []);

  /** Write first; only commit React state on success. */
  const commit = useCallback((next: WatchlistEntry[]): boolean => {
    const ok = writeWatchlist(next);
    if (ok) setEntries(next);
    return ok;
  }, []);

  const getEntry = useCallback(
    (id: number) => entries.find((e) => e.id === id),
    [entries],
  );

  const isInList = useCallback(
    (id: number) => entries.some((e) => e.id === id),
    [entries],
  );

  const add = useCallback(
    (anime: Anime, status: WatchStatus = "planning"): boolean => {
      const prev = entries;
      const existing = prev.find((e) => e.id === anime.id);
      let next: WatchlistEntry[];
      if (existing) {
        next = prev.map((e) =>
          e.id === anime.id
            ? {
                ...e,
                ...animeToEntry(anime, status),
                watchStatus: status,
                progress: e.progress,
                userRating: e.userRating,
                notes: e.notes,
                addedAt: e.addedAt,
                updatedAt: new Date().toISOString(),
              }
            : e,
        );
      } else {
        next = [animeToEntry(anime, status), ...prev];
      }

      const ok = commit(next);
      if (!ok) return false;

      queueMicrotask(() => {
        emitNexus({
          type: "anime_added",
          animeId: anime.id,
          title: anime.title,
        });
        markRecAccepted(anime.id);
        if (status === "watching") {
          emitNexus({ type: "anime_started", animeId: anime.id });
          fireSeal(anime.title, "watching");
        } else if (status === "completed") {
          emitNexus({
            type: "anime_completed",
            animeId: anime.id,
            title: anime.title,
          });
          recordCompletion({ id: anime.id, title: anime.title });
          fireSeal(anime.title, "completed");
        } else {
          fireSeal(anime.title, "seal");
        }
      });
      return true;
    },
    [entries, commit],
  );

  const remove = useCallback(
    (id: number): boolean => {
      const next = entries.filter((e) => e.id !== id);
      const ok = commit(next);
      if (!ok) return false;
      queueMicrotask(() => {
        emitNexus({ type: "anime_removed", animeId: id });
      });
      return true;
    },
    [entries, commit],
  );

  const setStatus = useCallback(
    (id: number, status: WatchStatus): boolean => {
      const current = entries.find((e) => e.id === id);
      const next = entries.map((e) =>
        e.id === id
          ? { ...e, watchStatus: status, updatedAt: new Date().toISOString() }
          : e,
      );
      const ok = commit(next);
      if (!ok) return false;

      if (
        status === "dropped" &&
        current &&
        current.watchStatus !== "dropped"
      ) {
        queueMicrotask(() => {
          emitNexus({ type: "anime_dropped", animeId: id });
        });
      }

      if (
        status === "completed" &&
        current &&
        current.watchStatus !== "completed"
      ) {
        queueMicrotask(() => {
          fireSeal(current.title, "completed");
          recordCompletion({ id: current.id, title: current.title });
          emitNexus({
            type: "anime_completed",
            animeId: current.id,
            title: current.title,
          });
        });
      }

      return true;
    },
    [entries, commit],
  );

  const setProgress = useCallback(
    (id: number, progress: number): boolean => {
      const next = entries.map((e) =>
        e.id === id
          ? {
              ...e,
              progress: Math.max(0, progress),
              updatedAt: new Date().toISOString(),
            }
          : e,
      );
      return commit(next);
    },
    [entries, commit],
  );

  const setUserRating = useCallback(
    (id: number, rating: number): boolean => {
      const next = entries.map((e) =>
        e.id === id
          ? {
              ...e,
              userRating: Math.min(10, Math.max(0, rating)),
              updatedAt: new Date().toISOString(),
            }
          : e,
      );
      return commit(next);
    },
    [entries, commit],
  );

  const clearAll = useCallback((): boolean => commit([]), [commit]);

  const replaceAll = useCallback(
    (next: WatchlistEntry[]): boolean => commit(next),
    [commit],
  );

  const value = useMemo(
    () => ({
      entries,
      ready,
      getEntry,
      isInList,
      add,
      remove,
      setStatus,
      setProgress,
      setUserRating,
      clearAll,
      replaceAll,
    }),
    [
      entries,
      ready,
      getEntry,
      isInList,
      add,
      remove,
      setStatus,
      setProgress,
      setUserRating,
      clearAll,
      replaceAll,
    ],
  );

  return (
    <WatchlistContext.Provider value={value}>
      {children}
    </WatchlistContext.Provider>
  );
}

export function useWatchlist() {
  const ctx = useContext(WatchlistContext);
  if (!ctx) {
    throw new Error("useWatchlist must be used within WatchlistProvider");
  }
  return ctx;
}
