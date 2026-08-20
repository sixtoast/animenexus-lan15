/**
 * Sakura petal ambience (Sprint 35 — removal).
 * Canvas is no longer mounted in the root layout.
 * Preference kept only so old localStorage keys stay harmless.
 */

const KEY = "anime_nexus_sakura";

export type SakuraPref = "on" | "off";

/** Product default: off. Opt-in only if something re-mounts the canvas. */
export function readSakuraPref(): SakuraPref {
  if (typeof window === "undefined") return "off";
  try {
    const v = localStorage.getItem(KEY);
    if (v === "on") return "on";
  } catch {
    /* */
  }
  return "off";
}

export function writeSakuraPref(pref: SakuraPref): void {
  try {
    localStorage.setItem(KEY, pref);
  } catch {
    /* */
  }
  applySakuraToDocument(pref);
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event("animenexus:sakura"));
  }
}

export function applySakuraToDocument(pref: SakuraPref): void {
  if (typeof document === "undefined") return;
  // Always mark off in the DOM after Sprint 35 — no live petal layer.
  document.documentElement.setAttribute("data-sakura", "off");
  void pref;
}

export function toggleSakuraPref(): SakuraPref {
  const next: SakuraPref = readSakuraPref() === "on" ? "off" : "on";
  writeSakuraPref(next);
  return next;
}
