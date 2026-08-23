"use client";

/**
 * Radar instrument micro (Sprint 11).
 * scan → signal → identify → result
 */

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import type { Anime } from "@/lib/types";
import { loadingStart, loadingStop } from "@/components/LoadingTheater";
import { useWatchlist } from "@/components/WatchlistProvider";
import {
  rankRecommendations,
  type RankedRecommendation,
} from "@/lib/recommend-rank";
import { rejectedAnimeIds } from "@/lib/recommend-feedback";
import { emitNexus } from "@/lib/nexus";
import { SignalError, signalErrorBody } from "@/components/SignalError";
import { WhyThisIsHere } from "@/components/WhyThisIsHere";
import { playCue } from "@/lib/sound-engine";

const PREFS_KEY = "anime_nexus_radar_prefs";
const ALERTS_KEY = "anime_nexus_radar_alerts";
const MAX_PING_SFX = 4;

const GENRES = [
  "",
  "Action",
  "Adventure",
  "Comedy",
  "Drama",
  "Fantasy",
  "Horror",
  "Romance",
  "Sci-Fi",
  "Slice of Life",
  "Sports",
  "Supernatural",
  "Thriller",
];

type Prefs = { genre: string; studio: string };

type Phase = "idle" | "scanning" | "signal" | "identify" | "result" | "error";

const PHASE_COPY: Record<
  Exclude<Phase, "error">,
  { step: string; line: string }
> = {
  idle: {
    step: "Standby",
    line: "Set frequency, then scan the horizon.",
  },
  scanning: {
    step: "Scan",
    line: "Sweeping upcoming releases…",
  },
  signal: {
    step: "Signal",
    line: "Contact — locking the band…",
  },
  identify: {
    step: "Identify",
    line: "Resolving titles against your shelf…",
  },
  result: {
    step: "Result",
    line: "Contacts identified.",
  },
};

export function RadarClient() {
  const { entries, ready } = useWatchlist();
  const [prefs, setPrefs] = useState<Prefs>({ genre: "", studio: "" });
  const [alerts, setAlerts] = useState(false);
  const [raw, setRaw] = useState<Anime[]>([]);
  const [phase, setPhase] = useState<Phase>("idle");
  const [err, setErr] = useState<string | null>(null);
  const [prefsHydrated, setPrefsHydrated] = useState(false);
  const [calibNudge, setCalibNudge] = useState(false);
  const [hoverId, setHoverId] = useState<number | null>(null);

  useEffect(() => {
    emitNexus({ type: "tool_opened", tool: "radar" });
    try {
      const rawPrefs = localStorage.getItem(PREFS_KEY);
      if (rawPrefs) setPrefs({ genre: "", studio: "", ...JSON.parse(rawPrefs) });
      setAlerts(localStorage.getItem(ALERTS_KEY) === "true");
    } catch {
      /* ignore */
    }
    setPrefsHydrated(true);
  }, []);

  useEffect(() => {
    if (!prefsHydrated || !ready || entries.length < 2) return;
    if (prefs.genre) return;
    try {
      const existing = localStorage.getItem(PREFS_KEY);
      if (existing) {
        const p = JSON.parse(existing) as Prefs;
        if (p.genre) return;
      }
    } catch {
      /* */
    }
    const counts = new Map<string, number>();
    for (const e of entries) {
      for (const g of e.genres || []) {
        counts.set(g, (counts.get(g) || 0) + 1);
      }
    }
    const top = [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0];
    if (top && GENRES.includes(top)) {
      setPrefs((p) => ({ ...p, genre: top }));
    }
  }, [prefsHydrated, ready, entries, prefs.genre]);

  const ranked: RankedRecommendation[] = useMemo(() => {
    if (!raw.length) return [];
    if (!ready || entries.length < 2) {
      return raw.map((anime) => ({
        anime,
        score: 0.4,
        confidence: "exploratory" as const,
        resonanceSim: 0,
        reasons: ["Upcoming on the dial — no shelf lock yet"],
      }));
    }
    const exclude = new Set<number>([
      ...entries.map((e) => e.id),
      ...rejectedAnimeIds(),
    ]);
    return rankRecommendations(raw, entries, {
      excludeIds: exclude,
      resonanceWeight: 0.5,
    });
  }, [raw, ready, entries]);

  const shelfTuned = ready && entries.length >= 2 && ranked.length > 0;
  const scanning =
    phase === "scanning" || phase === "signal" || phase === "identify";
  const phaseMeta =
    phase === "error"
      ? { step: "Lost", line: "The sweep dropped." }
      : PHASE_COPY[phase];

  async function scan() {
    setErr(null);
    setRaw([]);
    setPhase("scanning");
    playCue("radar_ping");
    loadingStart("radar");
    try {
      localStorage.setItem(PREFS_KEY, JSON.stringify(prefs));

      const reduced =
        typeof window !== "undefined" &&
        window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      const beat = (ms: number) =>
        reduced ? Promise.resolve() : new Promise((r) => setTimeout(r, ms));

      await beat(320);
      setPhase("signal");
      playCue("radar_ping");

      const q = prefs.genre
        ? `?genre=${encodeURIComponent(prefs.genre)}`
        : "";
      const res = await fetch(`/api/upcoming${q}`);
      const j = await res.json();
      if (!res.ok) throw new Error(j.error || "Scan failed");

      let list = (j.data || []) as Anime[];
      if (prefs.studio.trim()) {
        const s = prefs.studio.trim().toLowerCase();
        list = list.filter((a) =>
          (a.studios || []).some((x) => x.toLowerCase().includes(s)),
        );
      }

      setPhase("identify");
      await beat(280);
      setRaw(list);
      setPhase("result");

      // Limited audible pings for first contacts only
      const n = Math.min(list.length, MAX_PING_SFX);
      for (let i = 0; i < n; i++) {
        window.setTimeout(() => playCue("radar_ping"), 80 + i * 110);
      }
      if (list.length === 0) {
        // Sweep finishes naturally — calm, no error cheer
        playCue("filter_select");
      } else {
        playCue("signal_acquired");
      }
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Scan failed");
      setRaw([]);
      setPhase("error");
      playCue("error");
    } finally {
      loadingStop();
    }
  }

  function toggleAlerts() {
    const next = !alerts;
    setAlerts(next);
    localStorage.setItem(ALERTS_KEY, String(next));
  }

  function onPrefChange(patch: Partial<Prefs>) {
    setPrefs((p) => ({ ...p, ...patch }));
    setCalibNudge(true);
    playCue("filter_select");
    window.setTimeout(() => setCalibNudge(false), 400);
  }

  return (
    <div
      className={
        "radar-instrument" +
        (scanning ? " is-scanning" : "") +
        (phase === "result" ? " is-settled" : "")
      }
    >
      <div className="radar-phase" role="status" aria-live="polite">
        <ol className="radar-phase-steps" aria-label="Radar sequence">
          {(["scanning", "signal", "identify", "result"] as const).map(
            (key) => {
              const order = ["scanning", "signal", "identify", "result"];
              const activeIdx = order.indexOf(
                phase === "idle" || phase === "error" ? "" : phase,
              );
              const i = order.indexOf(key);
              const done =
                phase === "result"
                  ? true
                  : activeIdx >= 0 && i < activeIdx;
              const active = phase === key;
              return (
                <li
                  key={key}
                  className={
                    "radar-phase-step" +
                    (active ? " is-active" : "") +
                    (done ? " is-done" : "")
                  }
                >
                  {PHASE_COPY[key].step}
                </li>
              );
            },
          )}
        </ol>
        <p className="radar-phase-line">{phaseMeta.line}</p>
      </div>

      <div className="radar-prefs">
        <div
          className={
            "radar-dish" +
            (scanning ? " scanning" : "") +
            (phase === "result" ? " settled" : "") +
            (calibNudge ? " calib-nudge" : "")
          }
          aria-hidden
        >
          <div className="radar-sweep" />
          <div className="radar-core" />
          {hoverId != null ? (
            <span className="radar-blip radar-blip--focus" />
          ) : null}
        </div>
        <label className="filter-label">Genre filter</label>
        <select
          className="filter-input"
          value={prefs.genre}
          onChange={(e) => onPrefChange({ genre: e.target.value })}
          disabled={scanning}
        >
          {GENRES.map((g) => (
            <option key={g || "any"} value={g}>
              {g || "Any genre"}
            </option>
          ))}
        </select>
        <label className="filter-label">Studio contains (optional)</label>
        <input
          className="filter-input"
          value={prefs.studio}
          onChange={(e) => onPrefChange({ studio: e.target.value })}
          placeholder="e.g. Kyoto"
          disabled={scanning}
        />
        <div className="daily-actions" style={{ marginTop: 12 }}>
          <button
            type="button"
            className="btn btn-accent btn-sm"
            onClick={scan}
            disabled={scanning}
          >
            {scanning ? "Sweep in progress…" : "Scan horizon"}
          </button>
          <button
            type="button"
            className="btn btn-outline btn-sm"
            onClick={toggleAlerts}
            disabled={scanning}
          >
            Alerts: {alerts ? "on" : "off"}
          </button>
        </div>
        <p className="tools-hint" style={{ marginTop: 8 }}>
          Prefs saved locally. Empty genre can soft-fill from your top shelf
          genre. Alerts flag is local-only (no push).
        </p>
      </div>

      {phase === "error" && err ? (
        <SignalError
          title="The signal went quiet."
          body={signalErrorBody(err)}
          detail={err}
          onRetry={scan}
          retryLabel="Scan again"
        />
      ) : null}

      {phase === "result" && ranked.length > 0 ? (
        <>
          {shelfTuned ? (
            <p
              className="tools-hint"
              style={{ marginTop: 16 }}
              role="status"
              aria-live="polite"
            >
              Contacts soft-ranked for your shelf — still a radar, not a
              scoreboard.
            </p>
          ) : null}
          <div className="radar-upcoming-grid" style={{ marginTop: 12 }}>
            {ranked.map((r, i) => (
              <div
                key={r.anime.id}
                className="radar-item-wrap"
                style={{ "--i": i } as React.CSSProperties}
              >
                <Link
                  href={`/anime/${r.anime.id}`}
                  className="radar-item radar-ping"
                  onMouseEnter={() => setHoverId(r.anime.id)}
                  onMouseLeave={() => setHoverId(null)}
                  onFocus={() => setHoverId(r.anime.id)}
                  onBlur={() => setHoverId(null)}
                  data-focused={hoverId === r.anime.id ? "true" : undefined}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={r.anime.image} alt="" />
                  <div className="radar-title">{r.anime.title}</div>
                  <div className="radar-air">
                    {[
                      r.anime.format,
                      r.anime.season,
                      r.anime.seasonYear || r.anime.year,
                    ]
                      .filter(Boolean)
                      .join(" · ")}
                  </div>
                </Link>
                {shelfTuned ? (
                  <WhyThisIsHere ranked={r} className="why-here why-here--rail" />
                ) : null}
              </div>
            ))}
          </div>
        </>
      ) : phase === "result" && !scanning ? (
        <p className="tools-hint" style={{ marginTop: 16 }}>
          No contacts on this frequency. Try another genre or clear the studio
          filter.
        </p>
      ) : phase === "idle" ? (
        <p className="tools-hint" style={{ marginTop: 16 }}>
          Scan to load not-yet-released titles from AniList — results appear
          after identification, not mid-sweep.
        </p>
      ) : null}
    </div>
  );
}
