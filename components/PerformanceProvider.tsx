"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

export type PerformancePrefs = {
  portal: boolean;
  portalScene: boolean;
  portalParallax: boolean;
  portalViewTransition: boolean;
  portalMask: boolean;
  portalCharacters: boolean;
  portalGrain: boolean;
  cinematic: boolean;
  sound: boolean;
};

const KEY = "anime_nexus_performance_v1";

const DEFAULTS: PerformancePrefs = {
  portal: true,
  portalScene: true,
  portalParallax: true,
  portalViewTransition: true,
  portalMask: true,
  portalCharacters: true,
  portalGrain: true,
  cinematic: true,
  sound: true,
};

type Ctx = PerformancePrefs & {
  ready: boolean;
  setPref: <K extends keyof PerformancePrefs>(key: K, value: PerformancePrefs[K]) => void;
  reset: () => void;
  safeMode: boolean;
  setSafeMode: (enabled: boolean) => void;
};

const Context = createContext<Ctx | null>(null);

function read(): PerformancePrefs {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return DEFAULTS;
    return { ...DEFAULTS, ...JSON.parse(raw) };
  } catch {
    return DEFAULTS;
  }
}

function apply(p: PerformancePrefs) {
  const root = document.documentElement;
  root.dataset.portal = p.portal ? "on" : "off";
  root.dataset.portalScene = p.portalScene ? "on" : "off";
  root.dataset.portalParallax = p.portalParallax ? "on" : "off";
  root.dataset.portalTransition = p.portalViewTransition ? "on" : "off";
  root.dataset.portalMask = p.portalMask ? "on" : "off";
  root.dataset.portalCharacters = p.portalCharacters ? "on" : "off";
  root.dataset.portalGrain = p.portalGrain ? "on" : "off";
  root.dataset.cinematic = p.cinematic ? "on" : "off";
  root.dataset.uiSound = p.sound ? "on" : "off";
}

export function PerformanceProvider({ children }: { children: React.ReactNode }) {
  const [prefs, setPrefs] = useState<PerformancePrefs>(DEFAULTS);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const p = read();
    setPrefs(p);
    apply(p);
    setReady(true);
  }, []);

  const setPref = useCallback(<K extends keyof PerformancePrefs>(key: K, value: PerformancePrefs[K]) => {
    setPrefs(prev => {
      const next = { ...prev, [key]: value };
      try { localStorage.setItem(KEY, JSON.stringify(next)); } catch {}
      apply(next);
      return next;
    });
  }, []);

  const reset = useCallback(() => {
    setPrefs(DEFAULTS);
    try { localStorage.setItem(KEY, JSON.stringify(DEFAULTS)); } catch {}
    apply(DEFAULTS);
  }, []);

  const setSafeMode = useCallback((enabled: boolean) => {
    if (enabled) {
      const safe = { ...DEFAULTS, portal: false, portalScene: false, portalParallax: false, portalViewTransition: false, portalMask: false, portalCharacters: false, portalGrain: false, cinematic: false, sound: false };
      setPrefs(safe);
      try { localStorage.setItem(KEY, JSON.stringify(safe)); } catch {}
      apply(safe);
    } else reset();
  }, [reset]);

  const safeMode = !prefs.portal && !prefs.cinematic && !prefs.sound;
  const value = useMemo(() => ({ ...prefs, ready, setPref, reset, safeMode, setSafeMode }), [prefs, ready, setPref, reset, safeMode, setSafeMode]);
  return <Context.Provider value={value}>{children}</Context.Provider>;
}

export function usePerformance() {
  const ctx = useContext(Context);
  if (!ctx) throw new Error("usePerformance must be used within PerformanceProvider");
  return ctx;
}
