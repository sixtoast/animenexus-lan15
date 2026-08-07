import type { WatchlistEntry } from "./types";

export const TONIGHT_KEY = "anime_nexus_tonight_queue";

export type TonightItem = {
  id: number;
  title: string;
  image: string;
  minutes?: number;
};

export function readTonightQueue(): TonightItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(TONIGHT_KEY);
    if (!raw) return [];
    const j = JSON.parse(raw);
    return Array.isArray(j) ? j : [];
  } catch {
    return [];
  }
}

export function writeTonightQueue(items: TonightItem[]) {
  localStorage.setItem(TONIGHT_KEY, JSON.stringify(items.slice(0, 8)));
}

export function buildTonightFromList(entries: WatchlistEntry[]): TonightItem[] {
  const watching = entries.filter((e) => e.watchStatus === "watching");
  const planning = entries.filter((e) => e.watchStatus === "planning");
  const ordered = [...watching, ...planning];
  return ordered.slice(0, 6).map((e) => ({
    id: e.id,
    title: e.title,
    image: e.image,
    minutes: (e.duration || 24) * Math.max(1, e.progress || 1),
  }));
}
