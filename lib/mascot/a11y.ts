/**
 * Sprint 22 — Accessibility
 *
 * Mascot is enhancement only. Never required to use the site.
 * Prefs persist in localStorage; keyboard shortcuts are optional.
 */

const KEY_INTERACT = "anime_nexus_mascot_interact";
const KEY_AUDIO = "anime_nexus_mascot_audio";
const KEY_ENABLED = "anime_nexus_mascot";

export type MascotA11yPrefs = {
  /** User can pet / drag / click the companion */
  interactionsEnabled: boolean;
};

let interactionsEnabled = true;

export function loadA11yPrefs(): MascotA11yPrefs {
  try {
    const v = localStorage.getItem(KEY_INTERACT);
    interactionsEnabled = v !== "off";
  } catch {
    interactionsEnabled = true;
  }
  return { interactionsEnabled };
}

export function areInteractionsEnabled() {
  return interactionsEnabled;
}

export function setInteractionsEnabled(v: boolean) {
  interactionsEnabled = v;
  try {
    localStorage.setItem(KEY_INTERACT, v ? "on" : "off");
  } catch {
    /* */
  }
}

export function toggleInteractionsEnabled() {
  setInteractionsEnabled(!interactionsEnabled);
  return interactionsEnabled;
}

/** Human-readable status for screen readers (never exclusive info). */
export function companionStatusLine(input: {
  enabled: boolean;
  reducedMotion: boolean;
  audioOn: boolean;
  interactionsOn: boolean;
}): string {
  if (!input.enabled) return "Companion hidden.";
  if (input.reducedMotion) return "Companion paused for reduced motion.";
  const bits = ["Companion active"];
  bits.push(input.audioOn ? "sound on" : "sound off");
  bits.push(input.interactionsOn ? "interactive" : "look only");
  return bits.join(". ") + ".";
}

/**
 * Optional keyboard shortcuts (when focus is not in an input):
 * Alt+Shift+H — hide/show companion
 * Alt+Shift+M — mute/unmute mascot audio
 * Alt+Shift+I — toggle interactions
 */
export function bindMascotKeyboard(handlers: {
  toggleHide: () => void;
  toggleMute: () => void;
  toggleInteractions: () => void;
}): () => void {
  if (typeof window === "undefined") return () => {};

  const onKey = (e: KeyboardEvent) => {
    if (!e.altKey || !e.shiftKey) return;
    const t = e.target as HTMLElement | null;
    if (
      t &&
      (t.tagName === "INPUT" ||
        t.tagName === "TEXTAREA" ||
        t.tagName === "SELECT" ||
        t.isContentEditable)
    ) {
      return;
    }
    const k = e.key.toLowerCase();
    if (k === "h") {
      e.preventDefault();
      handlers.toggleHide();
    } else if (k === "m") {
      e.preventDefault();
      handlers.toggleMute();
    } else if (k === "i") {
      e.preventDefault();
      handlers.toggleInteractions();
    }
  };

  window.addEventListener("keydown", onKey);
  return () => window.removeEventListener("keydown", onKey);
}

export const A11Y_STORAGE = {
  enabled: KEY_ENABLED,
  audio: KEY_AUDIO,
  interact: KEY_INTERACT,
} as const;
