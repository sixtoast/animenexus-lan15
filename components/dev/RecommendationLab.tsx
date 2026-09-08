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
import type { Anime, WatchlistEntry } from "@/lib/types";
import { rankRecommendations } from "@/lib/recommend-rank";
import {
  isRecV3Enabled,
  getRecV3Mode,
  setRecV3Mode,
  describeRecV3Mode,
  type RecV3Mode,
} from "@/lib/intelligence/recommendation/feature-flag";

type Source = "current" | string;

export function RecommendationLab() {
  const { entries, ready } = useWatchlist();
  const [source, setSource] = useState<Source>("current");
  const [v3Mode, setV3ModeState] = useState<RecV3Mode>("auto");

  useEffect(() => {
    setV3ModeState(getRecV3Mode());
    const on = () => setV3ModeState(getRecV3Mode());
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

  const rankCompare = useMemo(() => {
    if (!activeEntries.length) return null;
    try {
      const candidates: Anime[] = [];
      const seen = new Set<number>();
      for (const e of activeEntries) {
        if (seen.has(e.id)) continue;
        seen.add(e.id);
        candidates.push({
          id: e.id,
          title: e.title,
          description: "",
          genre: (e.genres || e.tags || [])[0] || "",
          tags: [...(e.genres || []), ...(e.tags || [])],
          status: "FINISHED",
          format: (e.format as Anime["format"]) || "TV",
          year: e.year || "",
          score: e.score || 70,
          popularity: 50,
          image: e.image,
          anilist_id: e.id,
          episodes: e.episodes ?? 12,
          duration: e.duration || 24,
        });
      }
      for (const p of SYNTHETIC_PERSONAS) {
        if (persona && p.id === persona.id) continue;
        for (const e of p.entries.slice(0, 5)) {
          if (seen.has(e.id)) continue;
          seen.add(e.id);
          candidates.push({
            id: e.id,
            title: e.title,
            description: "",
            genre: (e.genres || e.tags || [])[0] || "",
            tags: [...(e.genres || []), ...(e.tags || [])],
            status: "FINISHED",
            format: (e.format as Anime["format"]) || "TV",
            year: e.year || "",
            score: e.score || 70,
            popularity: 40,
            image: e.image,
            anilist_id: e.id,
            episodes: e.episodes ?? 12,
            duration: e.duration || 24,
          });
        }
      }
      const exclude = new Set(activeEntries.map((e) => e.id));
      const open = candidates.filter((c) => !exclude.has(c.id));
      const pool = open.length >= 4 ? open : candidates;
      const v2 = rankRecommendations(pool, activeEntries, {
        excludeIds: exclude,
        forceVersion: "v2",
      }).slice(0, 8);
      const v3 = rankRecommendations(pool, activeEntries, {
        excludeIds: exclude,
        forceVersion: "v3",
      }).slice(0, 8);
      return { v2, v3, poolSize: pool.length };
    } catch (e) {
      return { error: String(e) };
    }
  }, [activeEntries, persona]);

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
        Rec engine mode{" "}
        <select
          value={v3Mode}
          onChange={(e) => {
            const m = e.target.value as RecV3Mode;
            setRecV3Mode(m);
            setV3ModeState(m);
          }}
        >
          <option value="auto">
            Auto (V3 when shelf evidence ≥ 3 completed)
          </option>
          <option value="on">Force V3</option>
          <option value="off">Force V2 (legacy)</option>
        </select>
        <span className="meta" style={{ marginLeft: "0.5rem" }}>
          {describeRecV3Mode(activeEntries)} · effective{" "}
          {isRecV3Enabled({ entries: activeEntries }) ? "V3" : "V2"}
        </span>
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
            <h2>V2 vs V3 ranking</h2>
            {!rankCompare ? (
              <p className="meta">Need shelf entries</p>
            ) : "error" in rankCompare ? (
              <p className="meta">Compare failed: {rankCompare.error}</p>
            ) : (
              <div
                className="rec-lab-compare"
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: "1rem",
                }}
              >
                <div>
                  <h3>V2 (forced)</h3>
                  <ol>
                    {rankCompare.v2.map((r) => (
                      <li key={`v2-${r.anime.id}`}>
                        {r.anime.title}{" "}
                        <span className="meta">
                          {r.score.toFixed(3)} · {r.confidence}
                        </span>
                      </li>
                    ))}
                  </ol>
                </div>
                <div>
                  <h3>V3 (forced)</h3>
                  <ol>
                    {rankCompare.v3.map((r) => (
                      <li key={`v3-${r.anime.id}`}>
                        {r.anime.title}{" "}
                        <span className="meta">
                          {r.score.toFixed(3)} · {r.confidence}
                        </span>
                        {r.reasons?.[0] ? (
                          <div className="meta">{r.reasons[0]}</div>
                        ) : null}
                      </li>
                    ))}
                  </ol>
                </div>
                <p className="meta" style={{ gridColumn: "1 / -1" }}>
                  Pool size {rankCompare.poolSize}. Mode select above controls
                  production path.
                </p>
              </div>
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
