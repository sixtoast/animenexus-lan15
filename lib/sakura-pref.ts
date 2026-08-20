/**
 * Sakura petal ambience preference (master plan · Sprint 20).
 * Full removal remains inventory Sprint 35 — this is opt-out only.
 */

const KEY = "anime_nexus_sakura";

export type SakuraPref = "on" | "off";

export function readSakuraPref(): SakuraPref {
  if (typeof window === "undefined") return "on";
  try {
    const v = localStorage.getItem(KEY);
    if (v === "off") return "off";
  } catch {
    /* */
  }
  return "on";
}

export function writeSakuraPref(pref: SakuraPref): void {
  try {
    localStorage.setItem(KEY, pref);
  } catch {
    /* */
  }
  applySakuraToDocument(pref);
}

export function applySakuraToDocument(pref: SakuraPref): void {
  if (typeof document === "undefined") return;
  if (pref === "off") {
    document.documentElement.setAttribute("data-sakura", "off");
  } else {
    document.documentElement.removeAttribute("data-sakura");
  }
}

export function toggleSakuraPref(): SakuraPref {
  const next: SakuraPref = readSakuraPref() === "on" ? "off" : "on";
  writeSakuraPref(next);
  return next;
}
