/**
 * Free-text viewing intent → structured ExperienceIntent overlay.
 * Does NOT recommend titles. Output feeds deterministic ranker + retrieval.
 */

import { callChatCompletions } from "@/lib/ai-chat";
import { isAIConfigured, readAISettings } from "@/lib/ai-settings";
import {
  EXPERIENCE_INTENTS,
  type ExperienceIntent,
  type IntentFingerprintTarget,
  type IntentFingerprintWeights,
  type SessionIntentControls,
} from "@/lib/viewing-intent";
import { parseJsonSafe } from "./json-extract";

export type StructuredViewingIntent = {
  /** Closest preset slug, or custom */
  intent: string;
  label?: string;
  emotional: IntentFingerprintTarget;
  narrative: IntentFingerprintTarget;
  experience: IntentFingerprintTarget;
  avoid: string[];
  hardAvoid: string[];
  prefer: string[];
  mustHave: string[];
  confidence: number;
  /** Optional dials inferred from text */
  session?: Partial<SessionIntentControls>;
  /** Short paraphrase for UI */
  paraphrase?: string;
};

const SYSTEM = `You are Lantern's intent interpreter for AnimeNexus.
Convert the user's free-text viewing mood into STRICT JSON only (no markdown, no prose).
Do NOT recommend anime titles. Do NOT invent show names.

Schema:
{
  "intent": string,           // closest of: ${EXPERIENCE_INTENTS.map((e) => e.slug).join(", ")} or "custom"
  "label": string,            // short human label
  "emotional": {              // 0..1 floats, omit unknown
    "comfort","melancholy","hope","darkness","tension","catharsis","wonder","humour","romance"
  },
  "narrative": {
    "mysteryDensity","narrativeComplexity","plotDensity","characterFocus","worldBuilding",
    "moralAmbiguity","twistDensity","slowPayoff","relationshipFocus"
  },
  "experience": {
    "pacing","cognitiveLoad","actionIntensity","emotionalIntensity","accessibility","commitment"
  },
  "mustHave": string[],
  "prefer": string[],
  "avoid": string[],
  "hardAvoid": string[],
  "confidence": number,       // 0..1
  "session": {
    "intensity": "light"|"moderate"|"maximum",
    "energy": "low"|"medium"|"high",
    "attention": "easy"|"medium"|"demanding"
  },
  "paraphrase": string        // one calm sentence restating the night they want
}

Rules:
- Map contradictions carefully (e.g. "relaxing but not boring" → comfort high, pacing not extremely low, plotDensity medium).
- Prefer sparse objects: only dimensions you are confident about.
- hardAvoid = absolute no; avoid = soft penalty.
- confidence low if the request is vague.`;

function clamp01(n: unknown): number | undefined {
  if (typeof n !== "number" || !Number.isFinite(n)) return undefined;
  return Math.max(0, Math.min(1, n));
}

function cleanPartial(
  obj: Record<string, unknown> | undefined,
): IntentFingerprintTarget {
  const out: IntentFingerprintTarget = {};
  if (!obj || typeof obj !== "object") return out;
  for (const [k, v] of Object.entries(obj)) {
    const c = clamp01(v);
    if (c != null) out[k] = c;
  }
  return out;
}

function cleanStringArr(v: unknown): string[] {
  if (!Array.isArray(v)) return [];
  return v
    .filter((x): x is string => typeof x === "string" && x.trim().length > 0)
    .map((s) => s.trim())
    .slice(0, 12);
}

export function normalizeStructuredIntent(
  raw: Partial<StructuredViewingIntent> | null,
): StructuredViewingIntent | null {
  if (!raw || typeof raw !== "object") return null;
  const intent =
    typeof raw.intent === "string" && raw.intent.trim()
      ? raw.intent.trim().toLowerCase().replace(/\s+/g, "_")
      : "custom";
  const confidence =
    typeof raw.confidence === "number" && Number.isFinite(raw.confidence)
      ? Math.max(0, Math.min(1, raw.confidence))
      : 0.5;
  return {
    intent,
    label: typeof raw.label === "string" ? raw.label : undefined,
    emotional: cleanPartial(raw.emotional as Record<string, unknown>),
    narrative: cleanPartial(raw.narrative as Record<string, unknown>),
    experience: cleanPartial(raw.experience as Record<string, unknown>),
    mustHave: cleanStringArr(raw.mustHave),
    prefer: cleanStringArr(raw.prefer),
    avoid: cleanStringArr(raw.avoid),
    hardAvoid: cleanStringArr(raw.hardAvoid),
    confidence,
    session: raw.session,
    paraphrase:
      typeof raw.paraphrase === "string" ? raw.paraphrase.slice(0, 240) : undefined,
  };
}

/** Merge structured intent into an ExperienceIntent the ranker understands. */
export function structuredToExperienceIntent(
  s: StructuredViewingIntent,
): ExperienceIntent {
  const base = EXPERIENCE_INTENTS.find((e) => e.slug === s.intent);
  const fingerprintTarget: IntentFingerprintTarget = {
    ...(base?.fingerprintTarget || {}),
    ...s.emotional,
    ...s.narrative,
    ...s.experience,
  };
  const fingerprintWeights: IntentFingerprintWeights = {
    ...(base?.fingerprintWeights || {}),
  };
  for (const k of Object.keys(s.emotional)) fingerprintWeights[k] = Math.max(fingerprintWeights[k] ?? 0.5, 0.85);
  for (const k of Object.keys(s.narrative)) fingerprintWeights[k] = Math.max(fingerprintWeights[k] ?? 0.5, 0.8);
  for (const k of Object.keys(s.experience)) fingerprintWeights[k] = Math.max(fingerprintWeights[k] ?? 0.5, 0.8);

  return {
    slug: base?.slug || s.intent || "custom",
    label: s.label || base?.label || "Custom night",
    emoji: base?.emoji || "✨",
    blurb: s.paraphrase || base?.blurb || "Free-text viewing intent",
    target: base?.target || {},
    fingerprintTarget,
    fingerprintWeights,
    genreHints: base?.genreHints || [],
    sort: base?.sort || "score",
    minScore: base?.minScore,
  };
}

export async function interpretViewingIntent(
  freeText: string,
  opts?: { temperature?: number },
): Promise<StructuredViewingIntent> {
  const text = freeText.trim();
  if (!text) {
    throw new Error("Describe the kind of night you want first.");
  }
  if (!isAIConfigured()) {
    throw new Error("Add an API key in the AI panel to interpret free-text moods.");
  }

  const raw = await callChatCompletions(
    [
      { role: "system", content: SYSTEM },
      {
        role: "user",
        content: `User mood request:\n"""${text.slice(0, 1200)}"""\n\nReturn JSON only.`,
      },
    ],
    { temperature: opts?.temperature ?? 0.2, settings: readAISettings() },
  );

  const parsed = normalizeStructuredIntent(
    parseJsonSafe<Partial<StructuredViewingIntent>>(raw),
  );
  if (!parsed) {
    throw new Error("Could not parse structured intent from the model.");
  }
  return parsed;
}
