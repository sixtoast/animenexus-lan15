"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

const STORAGE_KEY = "anime_nexus_motion";

/** User preference — overrides system prefers-reduced-motion when set. */
export type MotionPref = "full" | "reduced" | "system";

type Ctx = {
  /** Effective: animations should be reduced right now */
  reducedMotion: boolean;
  /** Stored preference */
  pref: MotionPref;
  setPref: (p: MotionPref) => void;
  /** Cycle full ↔ reduced (ignores system after first manual choice) */
  toggleMotion: () => void;
  ready: boolean;
};

const MotionContext = createContext<Ctx | null>(null);

function readPref(): MotionPref {
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    if (v === "full" || v === "reduced" || v === "system") return v;
  } catch {
    /* */
  }
  return "system";
}

function systemReduced(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function applyToDocument(reduced: boolean, pref: MotionPref) {
  const root = document.documentElement;
  root.dataset.motion = pref;
  if (reduced) root.setAttribute("data-reduce-motion", "true");
  else root.removeAttribute("data-reduce-motion");
}

export function MotionProvider({ children }: { children: React.ReactNode }) {
  const [pref, setPrefState] = useState<MotionPref>("system");
  const [sysReduced, setSysReduced] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const p = readPref();
    setPrefState(p);
    setSysReduced(systemReduced());
    const reduced =
      p === "reduced" ? true : p === "full" ? false : systemReduced();
    applyToDocument(reduced, p);
    setReady(true);

    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const onChange = () => {
      setSysReduced(mq.matches);
      const current = readPref();
      if (current === "system") {
        applyToDocument(mq.matches, "system");
      }
    };
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  const reducedMotion =
    pref === "reduced" ? true : pref === "full" ? false : sysReduced;

  const setPref = useCallback((p: MotionPref) => {
    setPrefState(p);
    try {
      localStorage.setItem(STORAGE_KEY, p);
    } catch {
      /* */
    }
    const reduced =
      p === "reduced" ? true : p === "full" ? false : systemReduced();
    applyToDocument(reduced, p);
  }, []);

  const toggleMotion = useCallback(() => {
    // Manual toggle always lands on full or reduced (clear system lock-in)
    setPref(reducedMotion ? "full" : "reduced");
  }, [reducedMotion, setPref]);

  // Keep document in sync when system changes under system pref
  useEffect(() => {
    if (!ready) return;
    applyToDocument(reducedMotion, pref);
  }, [reducedMotion, pref, ready]);

  const value = useMemo(
    () => ({ reducedMotion, pref, setPref, toggleMotion, ready }),
    [reducedMotion, pref, setPref, toggleMotion, ready],
  );

  return (
    <MotionContext.Provider value={value}>{children}</MotionContext.Provider>
  );
}

export function useMotion() {
  const ctx = useContext(MotionContext);
  if (!ctx) throw new Error("useMotion must be used within MotionProvider");
  return ctx;
}
