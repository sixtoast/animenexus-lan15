"use client";

import { useSound } from "@/components/SoundProvider";
import { Button } from "@/components/ui/Button";
import { playCue, unlockSound } from "@/lib/sound-engine";

/** Quick mute / unmute in the nav bar. */
export function NavSoundToggle() {
  const { prefs, setPrefs, unlock } = useSound();
  const on = prefs.enabled;

  return (
    <Button
      variant="icon"
      size="sm"
      className="nav-sound-toggle"
      title={on ? "Mute UI sound" : "Enable UI sound"}
      aria-label={on ? "Mute UI sound" : "Enable UI sound"}
      aria-pressed={on}
      silent
      onClick={() => {
        unlock();
        const next = !on;
        setPrefs({ enabled: next });
        if (next) {
          void unlockSound().then(() => playCue("ui_tap", { force: true }));
        }
      }}
    >
      <span aria-hidden style={{ fontSize: 14 }}>
        {on ? "🔊" : "🔇"}
      </span>
    </Button>
  );
}
