"use client";

import Link from "next/link";
import { usePerformance, type PerformancePrefs } from "@/components/PerformanceProvider";
import { NexusIcon } from "@/components/ui/NexusIcon";

type ToggleKey = keyof PerformancePrefs;

const PORTAL: { key: ToggleKey; title: string; description: string }[] = [
  { key: "portal", title: "Universe Portal", description: "Enable the cinematic Portal between discovery and an anime dossier." },
  { key: "portalScene", title: "Portal scene", description: "Orbital scene layers and atmospheric depth inside the Portal." },
  { key: "portalParallax", title: "Pointer parallax", description: "Subtle artwork and scene movement following pointer or touch input." },
  { key: "portalViewTransition", title: "View transitions", description: "Animate the Portal into the dossier during navigation." },
  { key: "portalMask", title: "Artwork mask", description: "Use the cinematic artwork fade/mask treatment." },
  { key: "portalCharacters", title: "Character layers", description: "Render additional character depth layers in cinematic views." },
  { key: "portalGrain", title: "Film grain", description: "Add grain and scanline texture to cinematic surfaces." },
];

const OTHER: { key: ToggleKey; title: string; description: string }[] = [
  { key: "cinematic", title: "Cinematic effects", description: "Enable broader atmospheric and motion effects outside the Portal." },
  { key: "sound", title: "UI sound", description: "Allow short interface sound cues." },
];

function Toggle({ item, enabled, disabled, onChange }: {
  item: { title: string; description: string };
  enabled: boolean;
  disabled?: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <label className={`perf-setting-row${disabled ? " is-disabled" : ""}`}>
      <span className="perf-setting-copy">
        <span className="perf-setting-title">{item.title}</span>
        <span className="perf-setting-description">{item.description}</span>
      </span>
      <input className="perf-toggle-input" type="checkbox" checked={enabled} disabled={disabled} onChange={e => onChange(e.target.checked)} />
      <span className="perf-toggle" aria-hidden><span /></span>
    </label>
  );
}

export default function PerformanceSettingsPage() {
  const p = usePerformance();

  const set = (key: ToggleKey, value: boolean) => p.setPref(key, value);

  return (
    <main className="performance-settings-page">
      <section className="performance-settings-hero">
        <Link href="/" className="performance-back"><NexusIcon name="empty" size="sm" /> Back to AnimeNexus</Link>
        <p className="performance-kicker">SYSTEM / PERFORMANCE</p>
        <h1>Performance &amp; Effects</h1>
        <p>Control the visual systems that can consume extra GPU, memory or battery. Changes are saved on this device.</p>
        {p.safeMode && <div className="performance-safe-banner">Emergency Safe Mode is active. Cinematic systems are disabled.</div>}
      </section>

      <section className="performance-settings-card performance-master">
        <div>
          <p className="performance-section-label">MASTER</p>
          <h2>Performance mode</h2>
          <p>Safe Mode disables the Portal and cinematic effects while leaving the rest of AnimeNexus available.</p>
        </div>
        <button type="button" className={`performance-safe-button${p.safeMode ? " active" : ""}`} onClick={() => p.setSafeMode(!p.safeMode)}>
          {p.safeMode ? "Safe Mode: ON" : "Enable Safe Mode"}
        </button>
      </section>

      <section className="performance-settings-card">
        <div className="performance-section-heading">
          <p className="performance-section-label">PORTAL</p>
          <span>{PORTAL.filter(x => p[x.key]).length}/{PORTAL.length} active</span>
        </div>
        <div className="performance-settings-list">
          {PORTAL.map(item => (
            <Toggle key={item.key} item={item} enabled={Boolean(p[item.key])} disabled={item.key !== "portal" && !p.portal} onChange={v => set(item.key, v)} />
          ))}
        </div>
      </section>

      <section className="performance-settings-card">
        <div className="performance-section-heading"><p className="performance-section-label">SYSTEM EFFECTS</p></div>
        <div className="performance-settings-list">
          {OTHER.map(item => <Toggle key={item.key} item={item} enabled={Boolean(p[item.key])} onChange={v => set(item.key, v)} />)}
        </div>
      </section>

      <section className="performance-settings-actions">
        <button type="button" className="performance-reset" onClick={p.reset}>Reset all effects to default</button>
        <p>Safe Mode is stored locally and can be switched off here at any time.</p>
      </section>
    </main>
  );
}
