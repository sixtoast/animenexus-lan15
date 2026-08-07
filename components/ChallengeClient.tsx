"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import type { Anime } from "@/lib/types";
import { dailySeed, pickSeeded, seededRandom } from "@/lib/daily-seed";
import { useToast } from "@/components/ToastProvider";
import { fireConfetti } from "@/components/ConfettiBurst";

type Mode = "silhouette" | "hard";

export function ChallengeClient() {
  const { showToast } = useToast();
  const [mode, setMode] = useState<Mode>("silhouette");
  const [pool, setPool] = useState<Anime[]>([]);
  const [anime, setAnime] = useState<Anime | null>(null);
  const [options, setOptions] = useState<string[]>([]);
  const [result, setResult] = useState<"ok" | "no" | null>(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [streak, setStreak] = useState(0);
  const [hardGuess, setHardGuess] = useState("");

  const seed = useMemo(() => dailySeed(), []);

  const buildRound = useCallback(
    (list: Anime[], extraSeed = 0) => {
      if (list.length < 4) return;
      const rnd = seededRandom(seed + extraSeed + list.length);
      const idx = Math.floor(rnd() * list.length);
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
      buildRound(data, 0);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Load failed");
      setAnime(null);
    } finally {
      setLoading(false);
    }
  }, [buildRound]);

  useEffect(() => {
    load();
  }, [load]);

  function answer(title: string) {
    if (!anime || result) return;
    const ok = title === anime.title;
    setResult(ok ? "ok" : "no");
    setStreak((s) => (ok ? s + 1 : 0));
    if (ok) {
      showToast("Correct frequency!", "✨", true);
      fireConfetti();
      window.dispatchEvent(new CustomEvent("animenexus:lantern-pulse"));
    } else showToast(`It was ${anime.title}`, "😅");
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
      fireConfetti();
      showToast("Correct frequency!", "✨", true);
      window.dispatchEvent(new CustomEvent("animenexus:lantern-pulse"));
    }
  }

  function nextRound() {
    if (pool.length) buildRound(pool, Date.now() % 10000);
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
    <div className="tools-panel">
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
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={anime.image} alt="" className={imgClass} />
        <div>
          <p className="daily-kicker">
            Daily seed {seed} · Streak {streak}
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
