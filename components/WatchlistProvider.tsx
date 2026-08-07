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

type Ctx = {
  entries: WatchlistEntry[];
  ready: boolean;
  getEntry: (id: number) => WatchlistEntry | undefined;
  isInList: (id: number) => boolean;
  add: (anime: Anime, status?: WatchStatus) => void;
  remove: (id: number) => void;
  setStatus: (id: number, status: WatchStatus) => void;
  setProgress: (id: number, progress: number) => void;
  setUserRating: (id: number, rating: number) => void;
  clearAll: () => void;
  replaceAll: (entries: WatchlistEntry[]) => void;
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

  const persist = useCallback((next: WatchlistEntry[]) => {
    setEntries(next);
    writeWatchlist(next);
  }, []);

  const getEntry = useCallback(
    (id: number) => entries.find((e) => e.id === id),
    [entries],
  );

  const isInList = useCallback(
    (id: number) => entries.some((e) => e.id === id),
    [entries],
  );

  const add = useCallback((anime: Anime, status: WatchStatus = "planning") => {
    setEntries((prev) => {
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
      writeWatchlist(next);
      return next;
    });
  }, []);

  const remove = useCallback((id: number) => {
    setEntries((prev) => {
      const next = prev.filter((e) => e.id !== id);
      writeWatchlist(next);
      return next;
    });
  }, []);

  const setStatus = useCallback((id: number, status: WatchStatus) => {
    setEntries((prev) => {
      const current = prev.find((e) => e.id === id);
      const next = prev.map((e) =>
        e.id === id
          ? { ...e, watchStatus: status, updatedAt: new Date().toISOString() }
          : e,
      );
      writeWatchlist(next);

      // Quiet completion — only when transitioning into completed
      if (
        status === "completed" &&
        current &&
        current.watchStatus !== "completed"
      ) {
        queueMicrotask(() => {
          fireSeal(current.title, "completed");
          recordCompletion({ id: current.id, title: current.title });
        });
      }

      return next;
    });
  }, []);

  const setProgress = useCallback((id: number, progress: number) => {
    setEntries((prev) => {
      const next = prev.map((e) =>
        e.id === id
          ? {
              ...e,
              progress: Math.max(0, progress),
              updatedAt: new Date().toISOString(),
            }
          : e,
      );
      writeWatchlist(next);
      return next;
    });
  }, []);

  const setUserRating = useCallback((id: number, rating: number) => {
    setEntries((prev) => {
      const next = prev.map((e) =>
        e.id === id
          ? {
              ...e,
              userRating: Math.min(10, Math.max(0, rating)),
              updatedAt: new Date().toISOString(),
            }
          : e,
      );
      writeWatchlist(next);
      return next;
    });
  }, []);

  const clearAll = useCallback(() => {
    persist([]);
  }, [persist]);

  const replaceAll = useCallback(
    (next: WatchlistEntry[]) => {
      persist(next);
    },
    [persist],
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
