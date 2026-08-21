"use client";

import { useSound } from "@/components/SoundProvider";

export function SoundSettings() {
  const { prefs, setPrefs, play, unlock } = useSound();

  return (
    <div className="sound-settings" aria-label="Sound settings">
      <div className="sound-settings-row">
        <label className="sound-settings-label">
          <input
            type="checkbox"
            checked={prefs.enabled}
            onChange={(e) => {
              unlock();
              setPrefs({ enabled: e.target.checked });
              if (e.target.checked) play("ui_tap", { force: true });
            }}
          />
          Enable UI sound
        </label>
        <span className="tools-hint">Opt-in · short cues only · no music</span>
      </div>

      <label className="sound-settings-label sound-settings-slider">
        Master
        <input
          type="range"
          min={0}
          max={1}
          step={0.05}
          disabled={!prefs.enabled}
          value={prefs.master}
          onChange={(e) => setPrefs({ master: parseFloat(e.target.value) })}
          onPointerUp={() => prefs.enabled && play("ui_tap")}
        />
      </label>

      <label className="sound-settings-label sound-settings-slider">
        UI
        <input
          type="range"
          min={0}
          max={1}
          step={0.05}
          disabled={!prefs.enabled}
          value={prefs.ui}
          onChange={(e) => setPrefs({ ui: parseFloat(e.target.value) })}
        />
      </label>

      <label className="sound-settings-label sound-settings-slider">
        Tools
        <input
          type="range"
          min={0}
          max={1}
          step={0.05}
          disabled={!prefs.enabled}
          value={prefs.tool}
          onChange={(e) => setPrefs({ tool: parseFloat(e.target.value) })}
        />
      </label>

      <p className="tools-hint">
        Assets load from <code>/audio/ui/</code>. Run{" "}
        <code>node scripts/generate-ui-sfx.mjs</code> if files are missing.
        Mascot beeps remain a separate optional fallback.
      </p>
    </div>
  );
}
