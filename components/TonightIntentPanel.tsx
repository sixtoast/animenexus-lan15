"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useWatchlist } from "@/components/WatchlistProvider";
import {
  EXPERIENCE_INTENTS,
  getExperienceIntent,
} from "@/lib/viewing-intent";
import {
  readIntentSession,
  writeIntentSession,
  type IntentAttention,
  type IntentEnergy,
  type IntentIntensity,
} from "@/lib/intent-session";
import { inferTonightGuess } from "@/lib/tonight-infer";
import { useSessionRevision } from "@/lib/use-session-revision";

type Props = {
  compact?: boolean;
};

const INTENSITY: { id: IntentIntensity; label: string }[] = [
  { id: "light", label: "Gentle" },
  { id: "moderate", label: "Steady" },
  { id: "maximum", label: "Brutal" },
];
const ENERGY: { id: IntentEnergy; label: string }[] = [
  { id: "low", label: "Low" },
  { id: "medium", label: "Medium" },
  { id: "high", label: "High" },
];
const ATTENTION: { id: IntentAttention; label: string }[] = [
  { id: "easy", label: "Easy" },
  { id: "medium", label: "Medium" },
  { id: "demanding", label: "Demanding" },
];

/**
 * Tonight Intent UI (R3)
 * Primary: what should tonight do to you?
 * Secondary: Energy · Attention · Intensity
 * Passive default from shelf + time of day.
 */
export function TonightIntentPanel({ compact }: Props) {
  const { entries, ready } = useWatchlist();
  const rev = useSessionRevision();
  const [slug, setSlug] = useState<string | null>(null);
  const [intensity, setIntensity] = useState<IntentIntensity>("moderate");
  const [energy, setEnergy] = useState<IntentEnergy>("medium");
  const [attention, setAttention] = useState<IntentAttention>("medium");
  const [adjustOpen, setAdjustOpen] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  const guess = useMemo(
    () => (ready ? inferTonightGuess(entries) : null),
    [ready, entries, rev],
  );

  useEffect(() => {
    const s = readIntentSession();
    if (s.slug) {
      setSlug(s.slug);
      setIntensity(s.intensity);
      setEnergy(s.energy);
      setAttention(s.attention || "medium");
    } else if (guess) {
      setSlug(guess.slug);
      setIntensity(guess.intensity);
      setEnergy(guess.energy);
      setAttention(guess.attention);
      writeIntentSession({
        slug: guess.slug,
        intensity: guess.intensity,
        energy: guess.energy,
        attention: guess.attention,
      });
    }
    setHydrated(true);
  }, [guess, rev]);

  function applySlug(next: string) {
    setSlug(next);
    writeIntentSession({ slug: next });
    setAdjustOpen(true);
  }

  function applyDial(
    partial: Partial<{
      intensity: IntentIntensity;
      energy: IntentEnergy;
      attention: IntentAttention;
    }>,
  ) {
    if (partial.intensity) setIntensity(partial.intensity);
    if (partial.energy) setEnergy(partial.energy);
    if (partial.attention) setAttention(partial.attention);
    writeIntentSession(partial);
  }

  const exp = slug ? getExperienceIntent(slug) : undefined;
  const passiveLine =
    hydrated && (exp?.label || guess?.line)
      ? `Lantern thinks tonight is ${exp?.label || guess?.label || "open"} · ${energy} energy · ${
          intensity === "maximum" ? "high intensity" : intensity
        }`
      : "Reading your desk…";

  return (
    <div
      className={
        "tonight-intent" + (compact ? " tonight-intent-compact" : "")
      }
    >
      <p className="tonight-intent-q">
        What do you want tonight to do to you?
      </p>

      <p className="tonight-intent-passive">
        {passiveLine}
        <button
          type="button"
          className="tonight-intent-adjust"
          onClick={() => setAdjustOpen((v) => !v)}
        >
          {adjustOpen ? "Hide" : "Adjust"}
        </button>
      </p>

      <div className="tonight-intent-choices" role="list">
        {EXPERIENCE_INTENTS.map((e) => {
          const active = slug === e.slug;
          return (
            <button
              key={e.slug}
              type="button"
              role="listitem"
              className={"tonight-intent-chip" + (active ? " active" : "")}
              title={e.blurb}
              onClick={() => applySlug(e.slug)}
            >
              <span aria-hidden>{e.emoji}</span>
              <span>{e.label}</span>
            </button>
          );
        })}
      </div>

      {adjustOpen ? (
        <div className="tonight-intent-dials">
          <DialRow
            label="Energy"
            options={ENERGY}
            value={energy}
            onChange={(v) => applyDial({ energy: v })}
          />
          <DialRow
            label="Attention"
            options={ATTENTION}
            value={attention}
            onChange={(v) => applyDial({ attention: v })}
          />
          <DialRow
            label="Intensity"
            options={INTENSITY}
            value={intensity}
            onChange={(v) => applyDial({ intensity: v })}
          />
          {slug ? (
            <p className="tonight-intent-go">
              <Link href={`/mood/${slug}`} className="btn btn-sm btn-outline">
                Open {exp?.label || "this path"}
              </Link>
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function DialRow<T extends string>({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: { id: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <div className="tonight-dial">
      <span className="tonight-dial-label">{label}</span>
      <div className="tonight-dial-opts">
        {options.map((o) => (
          <button
            key={o.id}
            type="button"
            className={"tonight-dial-btn" + (value === o.id ? " active" : "")}
            onClick={() => onChange(o.id)}
          >
            {o.label}
          </button>
        ))}
      </div>
    </div>
  );
}
