"use client";

import { useEffect, useMemo, useState } from "react";
import { useWatchlist } from "@/components/WatchlistProvider";
import {
  SYNTHETIC_PERSONAS,
  getPersona,
  type SyntheticPersona,
} from "@/lib/intelligence/evaluation/personas";
import { probePersona } from "@/lib/intelligence/evaluation/run-persona-probe";
import {
  buildUserPreferenceVector,
  blendUserVector,
} from "@/lib/intelligence/preference/user-preference-vector";
import { buildTasteClustersV3 } from "@/lib/intelligence/taste/taste-clusters-v3";
import { detectTasteDriftV3 } from "@/lib/intelligence/taste/taste-drift-v3";
import {
  inferNoveltyTolerance,
  explorationBudget,
} from "@/lib/intelligence/preference/novelty-tolerance";
import { buildCompletionProfile } from "@/lib/intelligence/outcomes/completion-profile";
import { detectTasteContradictions } from "@/lib/intelligence/taste/taste-contradictions";
import { detectBlindSpots } from "@/lib/intelligence/taste/blind-spots";
import { topPeakDims } from "@/lib/intelligence/taste/cluster-naming";
import { humanizeDimKey } from "@/lib/intelligence/items/fingerprint-similarity";
import {
  RANKER_VERSION,
  RANKER_V3_WEIGHTS,
} from "@/lib/intelligence/recommendation/ranker-v3";
import { CANDIDATE_GENERATOR_VERSION } from "@/lib/intelligence/recommendation/candidates-v3";
import { FINGERPRINT_VERSION } from "@/lib/intelligence/items";
import { PREFERENCE_MODEL_VERSION } from "@/lib/intelligence/preference/user-preference-vector";
import type { WatchlistEntry } from "@/lib/types";
import {
  isRecV3Enabled,
  setRecV3Enabled,
} from "@/lib/intelligence/recommendation/feature-flag";

type Source = "current" | string;

export function RecommendationLab() {
  const { entries, ready } = useWatchlist();
  const [source, setSource] = useState<Source>("current");
  const [v3On, setV3On] = useState(false);

  useEffect(() => {
    setV3On(isRecV3Enabled());
    const on = () => setV3On(isRecV3Enabled());
    window.addEventListener("animenexus:rec-v3", on);
    return () => window.removeEventListener("animenexus:rec-v3", on);
  }, []);

  const persona: SyntheticPersona | null =
    source === "current" ? null : getPersona(source) || null;

  const activeEntries: WatchlistEntry[] = persona ? persona.entries : entries;

  const model = useMemo(() => {
    if (!persona && !ready) return null;
    if (activeEntries.length === 0) return null;

    const user = buildUserPreferenceVector(activeEntries);
    const blended = blendUserVector(user);
    const peaks = topPeakDims(blended, 8, 0.08);
    const clusters = buildTasteClustersV3(activeEntries);
    const drift = detectTasteDriftV3(activeEntries);
    const novelty = inferNoveltyTolerance(activeEntries);
    const budget = explorationBudget(novelty);
    const completion = buildCompletionProfile(activeEntries);
    const contradictions = detectTasteContradictions(activeEntries, {
      minEvidence: 3,
    });
    const blind = detectBlindSpots(activeEntries, { maxSpots: 3 });

    return {
      user,
      peaks,
      clusters,
      drift,
      novelty,
      budget,
      completion,
      contradictions,
      blind,
    };
  }, [activeEntries, persona, ready]);

  const personaProbe = useMemo(() => {
    if (!persona) return null;
    return probePersona(persona);
  }, [persona]);

  return (
    <div className="rec-lab">
      <header className="rec-lab-header">
        <p className="tools-hint">
          Dev-only. Not linked from production nav. Robots noindex.
        </p>
        <div className="rec-lab-versions meta">
          <code>{FINGERPRINT_VERSION}</code>
          <code>{PREFERENCE_MODEL_VERSION}</code>
          <code>{CANDIDATE_GENERATOR_VERSION}</code>
          <code>{RANKER_VERSION}</code>
        </div>
      </header>

      <label className="rec-lab-source">
        Profile source{" "}
        <select value={source} onChange={(e) => setSource(e.target.value)}>
          <option value="current">Current browser shelf</option>
          {SYNTHETIC_PERSONAS.map((p) => (
            <option key={p.id} value={p.id}>
              Persona · {p.label}
            </option>
          ))}
        </select>
      </label>

      <label className="rec-lab-source">
        <input
          type="checkbox"
          checked={v3On}
          onChange={(e) => {
            setRecV3Enabled(e.target.checked);
            setV3On(e.target.checked);
          }}
        />{" "}
        Enable ranker/candidates V3 in this browser (localStorage{" "}
        <code>an_rec_v3</code>)
      </label>

      {persona ? (
        <section className="rec-lab-section">
          <h2>Persona</h2>
          <p>{persona.description}</p>
          <ul>
            {persona.expected.map((e) => (
              <li key={e}>{e}</li>
            ))}
          </ul>
          <p className="meta">{persona.entries.length} synthetic shelf entries</p>
        </section>
      ) : null}

      {!model ? (
        <p className="meta">
          {ready || persona
            ? "Need at least one shelf entry to build a model."
            : "Loading shelf…"}
        </p>
      ) : (
        <>
          <section className="rec-lab-section">
            <h2>User model</h2>
            <p className="meta">
              confidence {model.user.confidence.toFixed(2)} · evidence{" "}
              {model.user.evidenceCount}
            </p>
            <h3>Stable peaks</h3>
            <ul>
              {model.peaks.map((p) => (
                <li key={p.key}>
                  {humanizeDimKey(p.key)} {p.high ? "↑" : "↓"}{" "}
                  <span className="meta">{p.value.toFixed(2)}</span>
                </li>
              ))}
            </ul>
            <h3>Clusters (V3)</h3>
            {model.clusters.length === 0 ? (
              <p className="meta">No clusters yet</p>
            ) : (
              <ul>
                {model.clusters.map((c) => (
                  <li key={c.id}>
                    <strong>{c.label}</strong> · {c.state} · strength{" "}
                    {c.strength.toFixed(2)} · conf {c.confidence.toFixed(2)}
                    {c.genreHints.length
                      ? ` · hints: ${c.genreHints.join(", ")}`
                      : ""}
                  </li>
                ))}
              </ul>
            )}
            <h3>Drift</h3>
            {model.drift.length === 0 ? (
              <p className="meta">No significant fingerprint drift</p>
            ) : (
              <ul>
                {model.drift.map((t) => (
                  <li key={t.dimension}>
                    {t.label} {t.direction === "up" ? "↑" : "↓"} · strength{" "}
                    {t.strength.toFixed(2)} · conf {t.confidence.toFixed(2)}
                  </li>
                ))}
              </ul>
            )}
            <h3>Novelty & exploration budget</h3>
            <p>
              novelty {model.novelty.value.toFixed(2)} (conf{" "}
              {model.novelty.confidence.toFixed(2)}) → safe{" "}
              {(model.budget.safe * 100).toFixed(0)}% / adjacent{" "}
              {(model.budget.adjacent * 100).toFixed(0)}% / exploratory{" "}
              {(model.budget.exploratory * 100).toFixed(0)}%
            </p>
            <h3>Completion profile</h3>
            <p className="meta">
              overall finish rate{" "}
              {(model.completion.overallRate * 100).toFixed(0)}% · n=
              {model.completion.evidenceCount}
            </p>
            <ul>
              {model.completion.byLength.map((b) => (
                <li key={b.key}>
                  {b.key} eps: {(b.rate * 100).toFixed(0)}% ({b.completed}/
                  {b.started})
                </li>
              ))}
            </ul>
          </section>

          <section className="rec-lab-section">
            <h2>Contradictions</h2>
            {model.contradictions.length === 0 ? (
              <p className="meta">None above evidence threshold</p>
            ) : (
              <ul>
                {model.contradictions.map((c) => (
                  <li key={c.id}>
                    {c.claim}{" "}
                    <span className="meta">
                      conf {c.confidence.toFixed(2)} · n={c.evidenceCount}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="rec-lab-section">
            <h2>Blind spots</h2>
            {model.blind.length === 0 ? (
              <p className="meta">None (need more shelf signal)</p>
            ) : (
              <ul>
                {model.blind.map((b) => (
                  <li key={b.id}>
                    <strong>{b.label}</strong> · {b.exposure} exposure · compat{" "}
                    {b.compatibility.toFixed(2)} ·{" "}
                    {b.why.slice(0, 3).join(", ")}
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="rec-lab-section">
            <h2>Ranker V3 weights</h2>
            <pre className="rec-lab-pre">
              {JSON.stringify(RANKER_V3_WEIGHTS, null, 2)}
            </pre>
          </section>

          {personaProbe ? (
            <section className="rec-lab-section">
              <h2>Persona probe summary</h2>
              <pre className="rec-lab-pre">
                {JSON.stringify(personaProbe, null, 2)}
              </pre>
            </section>
          ) : null}
        </>
      )}
    </div>
  );
}
