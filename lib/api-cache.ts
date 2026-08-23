/**
 * Process-local short TTL cache for catalog API responses (Sprint 20).
 * Server components / route handlers only — not a substitute for CDN revalidate.
 */

type Entry<T> = { value: T; expires: number };

const store = new Map<string, Entry<unknown>>();
const DEFAULT_TTL_MS = 60_000;
const MAX_KEYS = 200;

export function cacheGet<T>(key: string): T | undefined {
  const e = store.get(key);
  if (!e) return undefined;
  if (Date.now() > e.expires) {
    store.delete(key);
    return undefined;
  }
  return e.value as T;
}

export function cacheSet<T>(key: string, value: T, ttlMs = DEFAULT_TTL_MS): void {
  if (store.size >= MAX_KEYS) {
    // Drop oldest-ish: first key
    const first = store.keys().next().value;
    if (first != null) store.delete(first);
  }
  store.set(key, { value, expires: Date.now() + ttlMs });
}

export async function cachedFetch<T>(
  key: string,
  fn: () => Promise<T>,
  ttlMs = DEFAULT_TTL_MS,
): Promise<T> {
  const hit = cacheGet<T>(key);
  if (hit !== undefined) return hit;
  const value = await fn();
  cacheSet(key, value, ttlMs);
  return value;
}

export function cacheKey(parts: (string | number | undefined | null)[]): string {
  return parts.map((p) => (p == null ? "" : String(p))).join("|");
}
