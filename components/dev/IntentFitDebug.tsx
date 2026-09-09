"use client";

import { useMemo, useState } from "react";
import {
  EXPERIENCE_INTENTS,
  buildExperienceFingerprintTarget,
  fingerprintIntentFit,
  type SessionIntentControls,
} from "@/lib/viewing-intent";
import { buildAnimePreferenceFingerprint } from "@/lib/intelligence/items";
import type { Anime } from "@/lib/types";
import { readIntentSession } from "@/lib/intent-session";

type Props = {
  sampleAnime?: Anime[];
};

export function IntentFitDebug({ sampleAnime = [] }: Props) {
  const session = typeof window !== "undefined" ? readIntentSession() : null;
  const [slug, setSlug] = useState(session?.slug || "destroy");
  const exp =
    EXPERIENCE_INTENTS.find((e) => e.slug === slug) || EXPERIENCE_INTENTS[0];

  const controls: SessionIntentControls = {
    intensity: session?.intensity ?? "moderate",
    energy: session?.energy ?? "medium",
    attention: session?.attention ?? "medium",
    minutesAvailable: session?.minutesAvailable ?? null,
  };

  const { target, weights } = useMemo(
    () => buildExperienceFingerprintTarget(exp, controls),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [exp.slug, controls.intensity, controls.energy, controls.attention],
  );

  const fits = useMemo(() => {
    return sampleAnime.slice(0, 8).map((a) => {
      const fp = buildAnimePreferenceFingerprint(a);
      return {
        id: a.id,
        title: a.title,
        fit: fingerprintIntentFit(fp, exp, controls),
      };
    });
  }, [sampleAnime, exp, controls]);

  return (
    <section className="lab-panel" style={{ marginTop: 24 }}>
      <h2>Viewing Intent · fingerprint target</h2>
      <p className="meta">
        Selected intent + session dials → authored dimensions only. Not a genre
        filter.
      </p>
      <label className="meta">
        Intent{" "}
        <select value={slug} onChange={(e) => setSlug(e.target.value)}>
          {EXPERIENCE_INTENTS.map((e) => (
            <option key={e.slug} value={e.slug}>
              {e.emoji} {e.label}
            </option>
          ))}
        </select>
      </label>
      <p className="meta" style={{ marginTop: 8 }}>
        Dials: {controls.intensity} intensity · {controls.energy} energy ·{" "}
        {controls.attention} attention
      </p>
      <ul style={{ fontFamily: "monospace", fontSize: 12, marginTop: 12 }}>
        {Object.entries(target).map(([k, v]) => (
          <li key={k}>
            {k.padEnd(36, " ")} {(v as number).toFixed(2)} ×
            {(weights[k] ?? 1).toFixed(2)}
          </li>
        ))}
        {!Object.keys(target).length ? (
          <li>(empty — surprise / novelty mode)</li>
        ) : null}
      </ul>
      {fits.length ? (
        <>
          <h3 style={{ marginTop: 16 }}>Sample candidate fit</h3>
          <ul style={{ fontFamily: "monospace", fontSize: 12 }}>
            {fits.map((f) => (
              <li key={f.id}>
                {f.fit.toFixed(3)} · {f.title}
              </li>
            ))}
          </ul>
        </>
      ) : null}
    </section>
  );
}
