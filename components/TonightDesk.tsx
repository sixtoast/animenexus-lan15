"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useWatchlist } from "@/components/WatchlistProvider";
import { WhyThisIsHere } from "@/components/WhyThisIsHere";
import { BehaviourTracker } from "@/components/BehaviourTracker";
import {
  rankRecommendations,
  preferenceTrendLine,
  preferenceClusterLabels,
  type RankedRecommendation,
} from "@/lib/recommend-rank";
import { rejectedAnimeIds, markRecShown } from "@/lib/recommend-feedback";
import { logOutcome } from "@/lib/outcome-events";
import {
  readIntentSession,
  writeIntentSession,
  type IntentEnergy,
  type IntentIntensity,
} from "@/lib/intent-session";
import { useSessionRevision } from "@/lib/use-session-revision";
import type { Anime } from "@/lib/types";

type Props = {
  candidates: Anime[];
};

function hourLabel(d = new Date()) {
  const h = d.getHours();
  if (h < 5) return "Late night";
  if (h < 12) return "Morning desk";
  if (h < 17) return "Afternoon";
  if (h < 21) return "Evening";
  return "Tonight";
}

export function TonightDesk({ candidates }: Props) {
  const { entries, ready } = useWatchlist();
  const sessionKey = useSessionRevision();
  const [intensity, setIntensity] = useState<IntentIntensity>("moderate");
  const [energy, setEnergy] = useState<IntentEnergy>("medium");
  const [minutes, setMinutes] = useState<number | null>(null);

  useEffect(() => {
    const s = readIntentSession();
    setIntensity(s.intensity);
    setEnergy(s.energy);
    setMinutes(s.minutesAvailable);
  }, [sessionKey]);

  function persist(partial: Parameters<typeof writeIntentSession>[0]) {
    const next = writeIntentSession(partial);
    setIntensity(next.intensity);
    setEnergy(next.energy);
    setMinutes(next.minutesAvailable);
  }

  const ranked: RankedRecommendation[] = useMemo(() => {
    if (!ready || entries.length < 1 || candidates.length < 2) return [];
    const exclude = new Set([
      ...entries.map((e) => e.id),
      ...rejectedAnimeIds(),
    ]);
    let list = rankRecommendations(candidates, entries, {
      excludeIds: exclude,
      experienceSlug: readIntentSession().slug || undefined,
    });

    if (minutes != null && minutes > 0) {
      list = [...list].sort((a, b) => {
        const da = a.anime.duration || 24;
        const db = b.anime.duration || 24;
        const fitA = Math.abs(da - minutes) + (da > minutes + 5 ? 40 : 0);
        const fitB = Math.abs(db - minutes) + (db > minutes + 5 ? 40 : 0);
        return fitA - fitB || b.score - a.score;
      });
    }

    if (energy === "low") {
      list = list.map((r) => {
        const tags = (r.anime.tags || []).map((t) => t.toLowerCase());
        const heavy = tags.some((t) =>
          ["psychological", "thriller", "mecha", "horror"].some((x) =>
            t.includes(x),
          ),
        );
        return heavy ? { ...r, score: r.score * 0.88 } : r;
      });
      list.sort((a, b) => b.score - a.score);
    }

    if (intensity === "light") {
      list = list.map((r) => {
        const tags = (r.anime.tags || []).map((t) => t.toLowerCase());
        const intense = tags.some((t) =>
          ["horror", "thriller", "psychological"].some((x) => t.includes(x)),
        );
        return intense ? { ...r, score: r.score * 0.9 } : r;
      });
      list.sort((a, b) => b.score - a.score);
    }

    return list.slice(0, 8);
  }, [ready, entries, candidates, intensity, energy, minutes, sessionKey]);

  useEffect(() => {
    for (const r of ranked) {
      markRecShown(r.anime.id);
      logOutcome(r.anime.id, "shown", { surface: "tonight_desk" });
    }
  }, [ranked]);

  const trend = ready ? preferenceTrendLine(entries) : null;
  const clusters = ready ? preferenceClusterLabels(entries) : [];

  return (
    <section className="tonight-desk" aria-label="Tonight desk">
      <div className="home-rail-head">
        <h2>{hourLabel()} · for you</h2>
        <span className="home-rail-note">Session · intent · clusters</span>
      </div>

      <div className="tonight-controls">
        <label className="tonight-ctrl">
          Intensity
          <select
            value={intensity}
            onChange={(e) =>
              persist({ intensity: e.target.value as IntentIntensity })
            }
          >
            <option value="light">Light</option>
            <option value="moderate">Moderate</option>
            <option value="maximum">Maximum</option>
          </select>
        </label>
        <label className="tonight-ctrl">
          Brainpower
          <select
            value={energy}
            onChange={(e) =>
              persist({ energy: e.target.value as IntentEnergy })
            }
          >
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
          </select>
        </label>
        <label className="tonight-ctrl">
          Minutes
          <select
            value={minutes ?? ""}
            onChange={(e) => {
              const v = e.target.value;
              persist({
                minutesAvailable: v === "" ? null : parseInt(v, 10),
              });
            }}
          >
            <option value="">Any</option>
            <option value="25">~25</option>
            <option value="45">~45</option>
            <option value="90">~90</option>
            <option value="120">~120</option>
          </select>
        </label>
        <Link href="/mood/comfort" className="tonight-intent-link">
          Set Viewing Intent →
        </Link>
      </div>

      {clusters.length ? (
        <p className="tonight-meta">
          Modes: {clusters.slice(0, 3).join(" · ")}
          {trend ? ` · ${trend}` : ""}
        </p>
      ) : (
        <p className="tonight-meta">
          Open a few titles or import a shelf — Lantern will personalise this
          strip.
        </p>
      )}

      {ranked.length === 0 ? (
        <p className="meta">Warming the desk… add to your shelf or browse.</p>
      ) : (
        <div className="tonight-grid">
          {ranked.map((r, i) => (
            <BehaviourTracker
              key={r.anime.id}
              animeId={r.anime.id}
              position={i}
              className="tonight-card"
            >
              <Link
                href={`/anime/${r.anime.id}`}
                className="tonight-card-link"
                onClick={() =>
                  logOutcome(r.anime.id, "opened", { surface: "tonight_desk" })
                }
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={r.anime.image} alt="" />
                <div className="tonight-card-body">
                  <div className="tonight-title">{r.anime.title}</div>
                  <div className="tonight-conf">{r.confidence}</div>
                </div>
              </Link>
              <WhyThisIsHere ranked={r} />
            </BehaviourTracker>
          ))}
        </div>
      )}
    </section>
  );
}
