/**
 * Lightweight localStorage affinity memory for the living companion.
 * Tracks genre preferences from seals / pets / dwell time so the
 * mascot can proactively point at high-affinity cards.
 */

const STORAGE_KEY = "anime_nexus_mascot_affinity";
const MAX_GENRES = 24;

export type AffinityMap = Record<string, number>;

function load(): AffinityMap {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as AffinityMap;
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function save(map: AffinityMap) {
  if (typeof window === "undefined") return;
  try {
    const entries = Object.entries(map)
      .sort((a, b) => b[1] - a[1])
      .slice(0, MAX_GENRES);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(Object.fromEntries(entries)));
  } catch {
    /* quota */
  }
}

export function getAffinity(): AffinityMap {
  return load();
}

export function bumpGenreAffinity(genres: string[], amount = 0.08) {
  if (!genres?.length) return;
  const map = load();
  for (const g of genres) {
    const key = (g || "").trim().toLowerCase();
    if (!key) continue;
    map[key] = Math.min(1, (map[key] || 0) + amount);
  }
  save(map);
}

export function scoreCardAffinity(genres: string[]): number {
  if (!genres?.length) return 0;
  const map = load();
  let sum = 0;
  let n = 0;
  for (const g of genres) {
    const key = (g || "").trim().toLowerCase();
    if (!key) continue;
    sum += map[key] || 0;
    n += 1;
  }
  return n ? sum / n : 0;
}

export function pickHighAffinityCardLandmark(
  landmarks: { id: string; type: string; rect: DOMRect | null; priority: number }[],
): { id: string; score: number } | null {
  let best: { id: string; score: number } | null = null;
  for (const lm of landmarks) {
    if (lm.type !== "card" || !lm.rect) continue;
    const parts = lm.id.split(":");
    const genres =
      parts.length >= 3
        ? parts[2].split(",").map((s) => s.trim()).filter(Boolean)
        : [];
    const score = scoreCardAffinity(genres) + lm.priority * 0.05;
    if (!best || score > best.score) best = { id: lm.id, score };
  }
  return best && best.score > 0.12 ? best : null;
}
