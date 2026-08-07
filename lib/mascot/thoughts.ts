import { COMPANION, dayPart } from "./personality";

export type ThoughtKind =
  | "idle"
  | "pet"
  | "seal"
  | "complete"
  | "point"
  | "climb"
  | "nap"
  | "wake"
  | "guide"
  | "bored"
  | "night"
  | "morning";

const FALLBACK: Record<ThoughtKind, string[]> = {
  idle: ["…watching the signals.", "Soft desk light tonight.", "Hmm."],
  pet: COMPANION.voice.lines.pet as unknown as string[],
  seal: ["Sealed.", "A quiet mark.", "Noted."],
  complete: ["Finished… nice.", "Another shelf lit.", "Good catch."],
  point: COMPANION.voice.lines.found as unknown as string[],
  climb: ["Up we go.", "Hold on…", "Climbing."],
  nap: ["Zzz…", "Just a moment…"],
  wake: COMPANION.voice.lines.greet as unknown as string[],
  guide: COMPANION.voice.lines.found as unknown as string[],
  bored: COMPANION.voice.lines.bored as unknown as string[],
  night: ["Late broadcast…", "Night shift."],
  morning: ["Fresh schedule.", "Daylight cards."],
};

export function pickThought(kind: ThoughtKind): string {
  const pool = FALLBACK[kind] || FALLBACK.idle;
  return pool[Math.floor(Math.random() * pool.length)];
}

export function speak(kind: ThoughtKind) {
  if (typeof window === "undefined") return;
  const text = pickThought(kind);
  window.dispatchEvent(
    new CustomEvent("animenexus:mascot-thought", { detail: { text, kind } }),
  );
}

export function ambientHourThought() {
  const b = dayPart();
  if (b === "night" || b === "late") speak("night");
  else if (b === "morning" || b === "dawn") speak("morning");
  else speak("idle");
}

/** Map dayPart-ish buckets for seasonal cosmetics */
export function hourBucket(
  d = new Date(),
): "night" | "morning" | "day" | "evening" {
  const p = dayPart(d);
  if (p === "night" || p === "late") return "night";
  if (p === "morning" || p === "dawn") return "morning";
  if (p === "evening") return "evening";
  return "day";
}
