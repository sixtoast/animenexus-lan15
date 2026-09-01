/**
 * Shareable session intent via URL query params.
 * Soft-fail: invalid values are ignored.
 */

import {
  readIntentSession,
  writeIntentSession,
  type IntentEnergy,
  type IntentIntensity,
  type IntentSession,
} from "./intent-session";

const INTENSITIES: IntentIntensity[] = ["light", "moderate", "maximum"];
const ENERGIES: IntentEnergy[] = ["low", "medium", "high"];

export function sessionToSearchParams(
  session: IntentSession = readIntentSession(),
): URLSearchParams {
  const p = new URLSearchParams();
  if (session.slug) p.set("experience", session.slug);
  if (session.intensity !== "moderate") p.set("intensity", session.intensity);
  if (session.energy !== "medium") p.set("energy", session.energy);
  if (session.minutesAvailable != null) {
    p.set("minutes", String(session.minutesAvailable));
  }
  return p;
}

export function sessionShareUrl(origin?: string): string {
  const base =
    origin ||
    (typeof window !== "undefined" ? window.location.origin : "");
  const q = sessionToSearchParams().toString();
  return q ? `${base}/?${q}` : `${base}/`;
}

/** Apply experience/intensity/energy/minutes from a URLSearchParams-like source. */
export function hydrateSessionFromParams(
  params: URLSearchParams | { get(name: string): string | null },
): IntentSession | null {
  const experience = params.get("experience");
  const intensityRaw = params.get("intensity");
  const energyRaw = params.get("energy");
  const minutesRaw = params.get("minutes");

  const partial: Partial<IntentSession> = {};
  let touched = false;

  if (experience && experience.trim()) {
    partial.slug = experience.trim().toLowerCase().slice(0, 48);
    touched = true;
  }
  if (intensityRaw && INTENSITIES.includes(intensityRaw as IntentIntensity)) {
    partial.intensity = intensityRaw as IntentIntensity;
    touched = true;
  }
  if (energyRaw && ENERGIES.includes(energyRaw as IntentEnergy)) {
    partial.energy = energyRaw as IntentEnergy;
    touched = true;
  }
  if (minutesRaw) {
    const n = Number(minutesRaw);
    if (Number.isFinite(n) && n > 0 && n <= 240) {
      partial.minutesAvailable = Math.round(n);
      touched = true;
    }
  }

  if (!touched) return null;
  return writeIntentSession(partial);
}
