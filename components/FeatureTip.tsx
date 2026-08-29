"use client";

import { useCallback, useEffect, useState } from "react";
import {
  hasSeenOnboarding,
  markOnboardingSeen,
  type OnboardingFeature,
} from "@/lib/onboarding-seen";
import { NexusLottie } from "@/components/lottie/NexusLottie";

export type FeatureTipCopy = {
  feature: OnboardingFeature;
  title: string;
  body: string;
  /** Optional public .lottie path */
  lottieSrc?: string;
  glyph?: string;
};

const COPY: Record<OnboardingFeature, Omit<FeatureTipCopy, "feature">> = {
  seal: {
    title: "Watchlist seal",
    body: "When you seal a title, Lantern remembers it on this browser — status, progress, and soft resonance.",
    glyph: "◎",
  },
  resonance: {
    title: "Resonance",
    body: "Your shelf shapes quiet ranks: genres and engagement pull soft recommendations toward your taste.",
    glyph: "∿",
  },
  living_shelf: {
    title: "Living Shelf",
    body: "A spatial view of what you sealed. Orbit, inspect, switch back to Manage anytime.",
    glyph: "▦",
  },
  oracle: {
    title: "Oracle",
    body: "Ask in plain language. Modes are real controls — the frequency panel is presentation only.",
    glyph: "◈",
  },
  journey: {
    title: "Journey",
    body: "Milestones from your desk over time — first seals, streaks, and quiet chapters.",
    glyph: "⇢",
  },
  radar: {
    title: "Radar",
    body: "Scan the catalogue by mood and signal. Results are real fetches — the instrument tracks phases.",
    glyph: "◎",
  },
};

type Props = {
  feature: OnboardingFeature;
  /** Force show (Help replay) */
  force?: boolean;
  className?: string;
  onDismiss?: () => void;
};

/**
 * Contextual first-encounter tip (Creative Sprint 11).
 * No autoplay carousel — only when the user hits the feature.
 */
export function FeatureTip({ feature, force, className = "", onDismiss }: Props) {
  const [open, setOpen] = useState(false);
  const meta = COPY[feature];

  useEffect(() => {
    if (force) {
      setOpen(true);
      return;
    }
    if (hasSeenOnboarding(feature)) {
      setOpen(false);
      return;
    }
    setOpen(true);
  }, [feature, force]);

  const dismiss = useCallback(() => {
    markOnboardingSeen(feature);
    setOpen(false);
    onDismiss?.();
  }, [feature, onDismiss]);

  if (!open) return null;

  return (
    <aside
      className={`nx-feature-tip ${className}`.trim()}
      role="status"
      aria-live="polite"
      data-feature={feature}
    >
      <NexusLottie
        src={meta.lottieSrc}
        height={64}
        width={64}
        loop={false}
        autoplay
        label={meta.title}
        className="nx-feature-tip-art"
        fallback={
          <span className="nx-feature-tip-glyph" aria-hidden>
            {meta.glyph}
          </span>
        }
      />
      <div className="nx-feature-tip-copy">
        <p className="nx-feature-tip-title">{meta.title}</p>
        <p className="nx-feature-tip-body">{meta.body}</p>
      </div>
      <button
        type="button"
        className="btn btn-outline btn-sm nx-feature-tip-dismiss"
        onClick={dismiss}
      >
        Got it
      </button>
    </aside>
  );
}

export { COPY as ONBOARDING_COPY };
