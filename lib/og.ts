/**
 * Open Graph helpers (Creative Sprint 17).
 *
 * Public OG only — never embed private shelf / taste / journey data
 * unless the user explicitly shares a public token (future).
 */

export type OgKind =
  | "site"
  | "anime"
  | "tool"
  | "session"
  | "journey"
  | "taste"
  | "shelf"
  | "compare";

export const OG_SIZE = { width: 1200, height: 630 } as const;

/** Absolute OG image URL for metadata. */
export function ogImageUrl(
  origin: string,
  kind: OgKind,
  params?: Record<string, string | number | undefined>,
): string {
  const base = origin.replace(/\/+$/, "");
  const sp = new URLSearchParams();
  sp.set("kind", kind);
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      if (v != null && String(v).length) sp.set(k, String(v));
    }
  }
  return `${base}/api/og?${sp.toString()}`;
}

/** Kinds that may include user-specific data only with explicit share=1. */
export const PRIVATE_OG_KINDS: OgKind[] = [
  "taste",
  "journey",
  "shelf",
  "session",
];

export function isPrivateOgKind(kind: OgKind): boolean {
  return PRIVATE_OG_KINDS.includes(kind);
}
