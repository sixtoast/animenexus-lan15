"use client";

/**
 * Site-wide sound (Sprint 1). Opt-in; unlocks on first user gesture.
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  getSoundPrefs,
  initSoundEngine,
  playCue,
  setSoundPrefs,
  unlockSound,
  type PlayOptions,
} from "@/lib/sound-engine";
import type { SoundCueId, SoundPrefs } from "@/lib/sound-manifest";

type SoundApi = {
  prefs: SoundPrefs;
  setPrefs: (p: Partial<SoundPrefs>) => void;
  play: (id: SoundCueId, opts?: PlayOptions) => void;
  unlock: () => void;
};

const SoundContext = createContext<SoundApi | null>(null);

export function SoundProvider({ children }: { children: React.ReactNode }) {
  const [prefs, setPrefsState] = useState<SoundPrefs>(() => getSoundPrefs());

  useEffect(() => {
    initSoundEngine();
    setPrefsState(getSoundPrefs());
  }, []);

  useEffect(() => {
    const unlock = () => {
      void unlockSound();
    };
    window.addEventListener("pointerdown", unlock, { once: true });
    window.addEventListener("keydown", unlock, { once: true });
    return () => {
      window.removeEventListener("pointerdown", unlock);
      window.removeEventListener("keydown", unlock);
    };
  }, []);

  const setPrefs = useCallback((partial: Partial<SoundPrefs>) => {
    setSoundPrefs(partial);
    setPrefsState(getSoundPrefs());
  }, []);

  const play = useCallback((id: SoundCueId, opts?: PlayOptions) => {
    playCue(id, opts);
  }, []);

  const unlock = useCallback(() => {
    void unlockSound();
  }, []);

  const value = useMemo(
    () => ({ prefs, setPrefs, play, unlock }),
    [prefs, setPrefs, play, unlock],
  );

  return (
    <SoundContext.Provider value={value}>{children}</SoundContext.Provider>
  );
}

export function useSound(): SoundApi {
  const ctx = useContext(SoundContext);
  if (!ctx) {
    return {
      prefs: getSoundPrefs(),
      setPrefs: setSoundPrefs,
      play: playCue,
      unlock: () => {
        void unlockSound();
      },
    };
  }
  return ctx;
}
