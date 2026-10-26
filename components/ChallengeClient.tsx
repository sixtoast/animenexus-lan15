"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import type { Anime } from "@/lib/types";
import { dailySeed, pickSeeded, seededRandom } from "@/lib/daily-seed";
import { useToast } from "@/components/ToastProvider";
import { fireConfetti } from "@/components/ConfettiBurst";
import { useWatchlist } from "@/components/WatchlistProvider";
import { rankRecommendations } from "@/lib/recommend-rank";
import { emitNexus } from "@/lib/nexus";
import { playCue } from "@/lib/sound-engine";
import { CountTick } from "@/components/ui/CountTick";
import { readIntentSession } from "@/lib/intent-session";
import { useSessionRevision } from "@/lib/use-session-revision";

type Mode = "silhouette" | "hard";

export function ChallengeClient() {
  const { showToast } = useToast();
  const { entries, ready } = useWatchlist();
  const sessionKey = useSessionRevision();
  const [mode, setMode] = useState<Mode>("silhouette");
  const [pool, setPool] = useState<Anime[]>([]);
  const [anime, setAnime] = useState<Anime | null>(null);
  const [options, setOptions] = useState<string[]>([]);
  const [result, setResult] = useState<"ok" | "no" | null>(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [streak, setStreak] = useState(0);
  const [hardGuess, setHardGuess] = useState("");
  const [shelfTuned, setShelfTuned] = useState(false);
  const [medal, setMedal] = useState(false);

  const seed = useMemo(() => dailySeed(), []);

  const tunedPool = useMemo(() => {
    if (!pool.length) return pool;
    if (!ready || entries.length < 2) return pool;
    const sess = readIntentSession();
    const ranked = rankRecommendations(pool, entries, {
      excludeIds: [],
      resonanceWeight: 0.55,
      experienceSlug: sess.slug || undefined,
    });
    if (!ranked.length) return pool;
    const rankedIds = new Set(ranked.map((r) => r.anime.id));
    const tail = pool.filter((a) => !rankedIds.has(a.id));
    return [...ranked.map((r) => r.anime), ...tail];
  }, [pool, ready, entries, sessionKey]);

  const buildRound = useCallback(
    (list: Anime[], extraSeed = 0) => {
      if (list.length < 4) return;
      const rnd = seededRandom(seed + extraSeed + list.length);
      const biasSpan = Math.max(4, Math.floor(list.length * 0.55));
      const idx = Math.floor(rnd() * biasSpan);
      const correct = list[idx];
      const distractors = pickSeeded(
        list.filter((a) => a.id !== correct.id),
        seed + extraSeed + 7,
        3,
      );
      const titles = pickSeeded(
        [correct.title, ...distractors.map((d) => d.title)],
        seed + extraSeed + 13,
        4,
      );
      setAnime(correct);
      setOptions(titles);
      setResult(null);
      setHardGuess("");
      setMedal(false);
    },
    [seed],
  );

  const load = useCallback(async () => {
    setLoading(true);
    setErr(null);
    try {
      const res = await fetch("/api/challenge-pool");
      if (!res.ok) throw new Error("Could not load challenge pool");
      const json = (await res.json()) as { data: Anime[] };
      const data = json.data || [];
      if (data.length < 4) throw new Error("Pool too small");
      setPool(data);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Load failed");
      setAnime(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    emitNexus({ type: "tool_opened", tool: "challenge" });
  }, [load]);

  useEffect(() => {
    if (!tunedPool.length) return;
    const tuned = ready && entries.length >= 2;
    setShelfTuned(tuned);
    buildRound(tunedPool, 0);
  }, [tunedPool, ready, entries.length, buildRound]);

  function onCorrect() {
    setMedal(true);
    playCue("challenge_ok");
    if (streak + 1 >= 3) fireConfetti();
    window.dispatchEvent(new CustomEvent("animenexus:lantern-pulse"));
  }

  function answer(title: string) {
    if (!anime || result) return;
    const ok = title === anime.title;
    setResult(ok ? "ok" : "no");
    setStreak((s) => (ok ? s + 1 : 0));
    if (ok) {
      onCorrect();
      showToast("Correct frequency!", "✦");
    } else {
      playCue("challenge_bad");
      showToast(`It was ${anime.title}`, "😅");
    }
  }

  function hardSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!anime) return;
    const year = String(anime.year || "");
    const score = anime.score ? anime.score.toFixed(1) : "";
    const g = hardGuess.trim().toLowerCase();
    const ok =
      g === year ||
      g === score ||
      g === String(anime.format || "").toLowerCase() ||
      g === anime.title.toLowerCase();
    setResult(ok ? "ok" : "no");
    setStreak((s) => (ok ? s + 1 : 0));
    if (ok) {
      onCorrect();
      showToast("Correct frequency!", "✦");
    } else {
      playCue("challenge_bad");
    }
  }

  function nextRound() {
    if (tunedPool.length) buildRound(tunedPool, Date.now() % 10000);
  }

  if (err) {
    return (
      <div className="state-box error">
        <p>{err}</p>
        <button type="button" className="btn btn-outline btn-sm" onClick={load}>
          Retry
        </button>
      </div>
    );
  }

  if (loading || !anime) {
    return (
      <div className="state-box">
        <div className="spinner" />
        <p>Tuning the silhouette…</p>
      </div>
    );
  }

  const imgClass =
    mode === "silhouette"
      ? result === null
        ? "silhouette"
        : "revealed"
      : result
        ? "revealed"
        : "";

  return (
    <div className={"tools-panel" + (medal ? " challenge-medal" : "")}>
      <div className="feed-tabs" role="tablist">
        <button
          type="button"
          className={"feed-tab" + (mode === "silhouette" ? " active" : "")}
          onClick={() => setMode("silhouette")}
        >
          Silhouette
        </button>
        <button
          type="button"
          className={"feed-tab" + (mode === "hard" ? " active" : "")}
          onClick={() => setMode("hard")}
        >
          Hard quiz
        </button>
      </div>

      <div className="challenge-hero">
        <div className="challenge-art-wrap">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={anime.image} alt="" className={imgClass} />
          {medal ? (
            <span className="challenge-medal-badge" aria-hidden>
              ✦
            </span>
          ) : null}
        </div>
        <div>
          <p className="daily-kicker">
            Daily seed {seed} · Streak{" "}
            <CountTick value={streak} className="challenge-streak" />
            {shelfTuned ? " · shelf-tuned" : ""}
          </p>
          <h2 className="challenge-q">
            {mode === "silhouette"
              ? "Who is this silhouette?"
              : "Score, year, or format?"}
          </h2>
          <p className="tools-hint" style={{ marginTop: 8 }}>
            {mode === "silhouette"
              ? "Pick the title. Art dissolves into color after you answer."
              : "Free-text: year, score (e.g. 8.5), format, or full title."}
            {shelfTuned
              ? " Rounds lean toward frequencies on your shelf — still fair."
              : ""}
          </p>
        </div>
      </div>

      {mode === "silhouette" ? (
        result === null ? (
          <div className="challenge-options">
            {options.map((t) => (
              <button
                key={t}
                type="button"
                className="btn btn-outline"
                style={{
                  width: "100%",
                  marginBottom: 8,
                  justifyContent: "flex-start",
                }}
                onClick={() => answer(t)}
              >
                {t}
              </button>
            ))}
          </div>
        ) : (
          <div className="challenge-result">
            <p className={result === "ok" ? "ok" : "no"}>
              {result === "ok"
                ? "Correct frequency."
                : `Off-channel. Answer: ${anime.title}`}
            </p>
            <div className="daily-actions">
              <Link
                href={`/anime/${anime.id}`}
                className="btn btn-outline btn-sm"
              >
                Open detail
              </Link>
              <button
                type="button"
                className="btn btn-accent btn-sm"
                onClick={nextRound}
              >
                Next silhouette
              </button>
            </div>
          </div>
        )
      ) : result === null ? (
        <form className="challenge-form" onSubmit={hardSubmit}>
          <input
            className="filter-input"
            value={hardGuess}
            onChange={(e) => setHardGuess(e.target.value)}
            placeholder="Year, score, format, or title"
            autoFocus
          />
          <button type="submit" className="btn btn-accent btn-sm">
            Lock in
          </button>
        </form>
      ) : (
        <div className="challenge-result">
          <p className={result === "ok" ? "ok" : "no"}>
            {result === "ok"
              ? "Correct."
              : `Answer: ${anime.title} · ${anime.year} · ★${anime.score?.toFixed?.(1) || "—"} · ${anime.format}`}
          </p>
          <button
            type="button"
            className="btn btn-accent btn-sm"
            onClick={nextRound}
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
