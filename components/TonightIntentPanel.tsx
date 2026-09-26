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
import { emitNexusSignal } from "@/lib/nexus-intelligence";

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

/** Tonight Intent — NL primary via Command Palette; dials secondary. */
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
    const session = writeIntentSession({ slug: next });
    emitNexusSignal({
      type: "filter",
      source: "user",
      payload: {
        mode: "mood",
        experienceSlug: next,
        session,
        label: `Mood aligned · ${getExperienceIntent(next)?.label || next}`,
      },
    });
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
    const session = writeIntentSession(partial);
    emitNexusSignal({
      type: "filter",
      source: "user",
      payload: {
        mode: "mood",
        experienceSlug: session.slug || undefined,
        session,
        label: `Mood dials · ${session.energy} energy · ${session.intensity} intensity · ${session.attention} attention`,
      },
    });
  }

  const exp = slug ? getExperienceIntent(slug) : undefined;
  const passiveLine =
    hydrated && (exp?.label || guess?.line)
      ? `Lantern thinks tonight is ${exp?.label || guess?.label || "open"} · ${energy} energy · ${
          intensity === "maximum" ? "high intensity" : intensity
        }`
      : "Reading your desk…";

  function openLanternSearch() {
    if (typeof window !== "undefined") {
      window.dispatchEvent(new Event("animenexus:open-search"));
    }
  }

  return (
    <div
      className={
        "tonight-intent" + (compact ? " tonight-intent-compact" : "")
      }
    >
      <p className="tonight-intent-freq">Tonight's frequency</p>
      <p className="tonight-intent-q">What do you want to feel?</p>

      <button
        type="button"
        className="tonight-intent-nl"
        onClick={openLanternSearch}
      >
        Tell Lantern in your own words
        <span className="tonight-intent-nl-arrow" aria-hidden>
          ↗
        </span>
      </button>

      <p className="tonight-intent-examples meta">
        e.g. something quiet after a long day · 12 episodes, strong fights ·
        outside my usual taste
      </p>

      <p className="tonight-intent-passive">{passiveLine}</p>

      <details
        className="tonight-intent-secondary"
        open={adjustOpen}
        onToggle={(e) =>
          setAdjustOpen((e.target as HTMLDetailsElement).open)
        }
      >
        <summary className="tonight-intent-dials-summary">Prefer dials?</summary>

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
                <span>{e.label}</span>
              </button>
            );
          })}
        </div>

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
      </details>
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
