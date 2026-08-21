/**
 * Honesty framing (Awwwards Sprint 17).
 * Marks AnimeNexus heuristics — never presents them as platform facts.
 */

export function ModelDisclosure({
  compact = false,
  className = "",
}: {
  compact?: boolean;
  className?: string;
}) {
  if (compact) {
    return (
      <p className={`model-disclosure model-disclosure--compact ${className}`.trim()}>
        AnimeNexus model · heuristic
      </p>
    );
  }
  return (
    <p className={`model-disclosure ${className}`.trim()} role="note">
      Resonance, rankings, and insights are <strong>AnimeNexus model readings</strong> —
      heuristics from your shelf and local activity, not AniList facts or claims about
      your life outside this desk.
    </p>
  );
}
