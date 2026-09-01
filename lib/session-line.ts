import type { IntentSession } from "@/lib/intent-session";
import { getExperienceIntent } from "@/lib/viewing-intent";

/** Compact human label for active session dials, or "" when defaults only. */
export function formatSessionLine(session: IntentSession): string {
  const bits: string[] = [];
  if (session.slug) {
    const exp = getExperienceIntent(session.slug);
    bits.push(exp?.label || session.slug);
  }
  if (session.intensity !== "moderate") bits.push(session.intensity);
  if (session.energy !== "medium") bits.push(session.energy);
  if (session.minutesAvailable != null) {
    bits.push(`${session.minutesAvailable}m`);
  }
  return bits.join(" · ");
}
