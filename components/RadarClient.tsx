"use client";

/**
 * Radar instrument (Sprint 11 + schedule bands).
 * scan → signal → identify → result
 * Shelf airing: RAW / SUB / DUB · TODAY / TOMORROW / WEEK
 */

import { useCallback, useEffect, useMemo, useState } from "react";
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
import {
  formatAirTime,
  groupContactsByWindow,
  type RadarContact,
  type TimeWindow,
} from "@/lib/radar-schedule";

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

const WINDOW_LABEL: Record<TimeWindow, string> = {
  today: "Today",
  tomorrow: "Tomorrow",
  week: "This week",
  later: "Later",
};

const BAND_LABEL = { raw: "RAW", sub: "SUB", dub: "DUB" } as const;

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
  const [contacts, setContacts] = useState<RadarContact[]>([]);
  const [scheduleNote, setScheduleNote] = useState<string | null>(null);
  const [scheduleLoading, setScheduleLoading] = useState(false);
  const [bandFilter, setBandFilter] = useState<"all" | "raw" | "sub" | "dub">(
    "all",
  );

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

  const shelfItems = useMemo(() => {
    return entries
      .filter((e) => e.watchStatus === "watching" || e.watchStatus === "planning")
      .slice(0, 12)
      .map((e) => ({ id: e.id, title: e.title, image: e.image }));
  }, [entries]);

  const loadShelfSchedule = useCallback(async () => {
    if (!shelfItems.length) {
      setContacts([]);
      setScheduleNote("Add watching/planning titles to your shelf for air signals.");
      return;
    }
    setScheduleLoading(true);
    setScheduleNote(null);
    try {
      const res = await fetch("/api/radar-schedule", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items: shelfItems }),
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error || "Schedule fetch failed");
      setContacts((j.contacts || []) as RadarContact[]);
      if (!j.configured) {
        setScheduleNote(
          j.note ||
            "AnimeSchedule not configured — set ANIMESCHEDULE_API_KEY for air times.",
        );
      } else if (!(j.contacts || []).length) {
        setScheduleNote("No upcoming air times found for shelf titles.");
      }
    } catch (e) {
      setContacts([]);
      setScheduleNote(
        e instanceof Error ? e.message : "Could not load shelf schedule",
      );
    } finally {
      setScheduleLoading(false);
    }
  }, [shelfItems]);

  useEffect(() => {
    if (!ready || !prefsHydrated) return;
    void loadShelfSchedule();
  }, [ready, prefsHydrated, loadShelfSchedule]);

  const filteredContacts = useMemo(() => {
    if (bandFilter === "all") return contacts;
    return contacts.filter((c) => c.band === bandFilter);
  }, [contacts, bandFilter]);

  const grouped = useMemo(
    () => groupContactsByWindow(filteredContacts),
    [filteredContacts],
  );

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

      const n = Math.min(list.length, MAX_PING_SFX);
      for (let i = 0; i < n; i++) {
        window.setTimeout(() => playCue("radar_ping"), 80 + i * 110);
      }
      if (list.length === 0) {
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

      {/* Shelf airing instrument */}
      <section className="radar-shelf-signals" style={{ marginBottom: 20 }}>
        <h3 className="tools-section-title" style={{ marginBottom: 8 }}>
          Your shelf signals
        </h3>
        <p className="tools-hint" style={{ marginBottom: 10 }}>
          Watching + planning only. Bands: RAW / SUB / DUB when AnimeSchedule
          provides times.
        </p>
        <div className="detail-actions" style={{ marginBottom: 12, flexWrap: "wrap", gap: 8 }}>
          {(["all", "sub", "raw", "dub"] as const).map((b) => (
            <button
              key={b}
              type="button"
              className={
                "btn btn-sm " +
                (bandFilter === b ? "btn-accent" : "btn-outline")
              }
              onClick={() => {
                setBandFilter(b);
                playCue("filter_select");
              }}
            >
              {b === "all" ? "All bands" : BAND_LABEL[b]}
            </button>
          ))}
          <button
            type="button"
            className="btn btn-outline btn-sm"
            onClick={() => void loadShelfSchedule()}
            disabled={scheduleLoading}
          >
            {scheduleLoading ? "Tuning…" : "Refresh air times"}
          </button>
        </div>
        {scheduleNote ? (
          <p className="tools-hint" role="status">
            {scheduleNote}
          </p>
        ) : null}
        {(["today", "tomorrow", "week", "later"] as TimeWindow[]).map((w) => {
          const list = grouped[w];
          if (!list.length) return null;
          return (
            <div key={w} style={{ marginTop: 12 }}>
              <h4
                style={{
                  fontSize: "0.8rem",
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                  color: "var(--color-text-muted)",
                  marginBottom: 6,
                }}
              >
                {WINDOW_LABEL[w]}
              </h4>
              <ul className="theme-ul">
                {list.map((c) => (
                  <li key={`${c.anilistId}-${c.band}-${c.at}`}>
                    <Link href={`/anime/${c.anilistId}`}>
                      <strong>{c.title}</strong>
                    </Link>
                    {" · "}
                    <span className="detail-source">
                      {BAND_LABEL[c.band]}
                    </span>
                    {c.episode != null ? ` · Ep ${c.episode}` : null}
                    {" · "}
                    {formatAirTime(c.at)}
                    {c.delayed ? " · delayed" : null}
                    {c.platforms?.length
                      ? ` · ${c.platforms.slice(0, 2).join(", ")}`
                      : null}
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </section>

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
          Horizon scan uses AniList upcoming. Shelf signals use AnimeSchedule
          when configured. Alerts flag is local-only.
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
          Scan horizon for not-yet-released titles, or rely on shelf signals
          above when AnimeSchedule is configured.
        </p>
      ) : null}
    </div>
  );
}
