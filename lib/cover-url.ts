/** Same-origin URL for WebGL / canvas-safe cover loading. */
export function coverProxyUrl(src: string | undefined | null): string {
  if (!src || !src.trim()) return "";
  const s = src.trim();
  // Already same-origin or data/blob
  if (s.startsWith("/") || s.startsWith("data:") || s.startsWith("blob:")) {
    return s;
  }
  try {
    const u = new URL(s);
    if (typeof window !== "undefined" && u.origin === window.location.origin) {
      return s;
    }
  } catch {
    return s;
  }
  return `/api/cover?u=${encodeURIComponent(s)}`;
}
