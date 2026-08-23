/**
 * Process-local cache with category TTLs (Multi-API Sprints 20 + 4).
 * Not a substitute for Next fetch revalidate / CDN.
 */

type Entry<T> = { value: T; expires: number };

const store = new Map<string, Entry<unknown>>();
const MAX_KEYS = 240;

/** Cache categories from the Multi-API plan */
export const CACHE_TTL = {
  /** Identity mappings, external ids */
  identity: 86_400_000, // 24h
  /** Themes, characters, staff, visuals */
  medium: 3_600_000, // 1h
  /** Catalog metadata pages */
  catalog: 60_000, // 1m (also Next revalidate 300)
  /** Schedules, next episode */
  short: 120_000, // 2m
  /** Default */
  default: 60_000,
} as const;

export type CacheCategory = keyof typeof CACHE_TTL;

export function cacheGet<T>(key: string): T | undefined {
  const e = store.get(key);
  if (!e) return undefined;
  if (Date.now() > e.expires) {
    store.delete(key);
    return undefined;
  }
  return e.value as T;
}

export function cacheSet<T>(
  key: string,
  value: T,
  ttlMs: number = CACHE_TTL.default,
): void {
  if (store.size >= MAX_KEYS) {
    const first = store.keys().next().value;
    if (first != null) store.delete(first);
  }
  store.set(key, { value, expires: Date.now() + ttlMs });
}

export async function cachedFetch<T>(
  key: string,
  fn: () => Promise<T>,
  ttlMs: number = CACHE_TTL.default,
): Promise<T> {
  const hit = cacheGet<T>(key);
  if (hit !== undefined) return hit;
  const value = await fn();
  cacheSet(key, value, ttlMs);
  return value;
}

export async function cachedFetchCategory<T>(
  category: CacheCategory,
  key: string,
  fn: () => Promise<T>,
): Promise<T> {
  return cachedFetch(key, fn, CACHE_TTL[category]);
}

export function cacheKey(parts: (string | number | undefined | null)[]): string {
  return parts.map((p) => (p == null ? "" : String(p))).join("|");
}

/** In-flight dedupe for identical keys */
const inflight = new Map<string, Promise<unknown>>();

export async function dedupedFetch<T>(
  key: string,
  fn: () => Promise<T>,
  ttlMs: number = CACHE_TTL.default,
): Promise<T> {
  const hit = cacheGet<T>(key);
  if (hit !== undefined) return hit;
  const existing = inflight.get(key);
  if (existing) return existing as Promise<T>;
  const p = fn()
    .then((value) => {
      cacheSet(key, value, ttlMs);
      return value;
    })
    .finally(() => {
      inflight.delete(key);
    });
  inflight.set(key, p);
  return p;
}
