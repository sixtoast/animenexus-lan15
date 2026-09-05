/**
 * Session Viewing Intent controls: intensity + energy + attention.
 * Stored locally; used as ranking constraints.
 */

export type IntentIntensity = "light" | "moderate" | "maximum";
export type IntentEnergy = "low" | "medium" | "high";
export type IntentAttention = "easy" | "medium" | "demanding";

export type IntentSession = {
  slug: string | null;
  intensity: IntentIntensity;
  energy: IntentEnergy;
  /** Cognitive / attention demand */
  attention: IntentAttention;
  minutesAvailable: number | null;
};

const KEY = "anime_nexus_intent_session_v1";

const DEFAULT: IntentSession = {
  slug: null,
  intensity: "moderate",
  energy: "medium",
  attention: "medium",
  minutesAvailable: null,
};

export function readIntentSession(): IntentSession {
  if (typeof window === "undefined") return { ...DEFAULT };
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { ...DEFAULT };
    return { ...DEFAULT, ...JSON.parse(raw) };
  } catch {
    return { ...DEFAULT };
  }
}

export function writeIntentSession(
  partial: Partial<IntentSession>,
): IntentSession {
  const next = { ...readIntentSession(), ...partial };
  if (typeof window !== "undefined") {
    try {
      localStorage.setItem(KEY, JSON.stringify(next));
      window.dispatchEvent(
        new CustomEvent("animenexus:intent", { detail: next }),
      );
    } catch {
      /* */
    }
  }
  return next;
}

/** Map intensity/energy/attention onto intent fingerprint deltas. */
export function intentControlOverlay(session: IntentSession): {
  intensityScale: number;
  cognitiveScale: number;
  pacingBias: number;
} {
  const intensityScale =
    session.intensity === "light"
      ? 0.65
      : session.intensity === "maximum"
        ? 1.25
        : 1;
  const attentionScale =
    session.attention === "easy"
      ? 0.55
      : session.attention === "demanding"
        ? 1.25
        : 1;
  const energyScale =
    session.energy === "low" ? 0.7 : session.energy === "high" ? 1.15 : 1;
  const cognitiveScale = attentionScale * 0.65 + energyScale * 0.35;
  const pacingBias =
    session.energy === "low" ? -0.15 : session.energy === "high" ? 0.12 : 0;
  return { intensityScale, cognitiveScale, pacingBias };
}
