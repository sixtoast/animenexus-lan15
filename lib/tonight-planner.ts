/**
 * Tonight planner (Multi-API Sprint 15).
 * Fits watching/planning shelf into an available time window.
 */

export type TonightCandidate = {
  id: number;
  title: string;
  image?: string;
  progress: number;
  episodes: number;
  durationMin: number;
  /** Seconds saved per ep if skips applied (estimate) */
  skipSecPerEp?: number;
  watchStatus?: string;
};

export type TonightPick = TonightCandidate & {
  remainingEps: number;
  minutesWithoutSkip: number;
  minutesWithSkip: number;
  fitsWithoutSkip: boolean;
  fitsWithSkip: boolean;
  reason: string;
};

export function rankTonight(
  candidates: TonightCandidate[],
  availableMin: number,
  opts?: { preferSkip?: boolean },
): TonightPick[] {
  const preferSkip = opts?.preferSkip ?? true;
  const picks: TonightPick[] = [];

  for (const c of candidates) {
    const total = c.episodes > 0 ? c.episodes : 0;
    const remainingEps =
      total > 0 ? Math.max(0, total - (c.progress || 0)) : 1;
    if (remainingEps <= 0) continue;

    const dur = c.durationMin > 0 ? c.durationMin : 24;
    const skipSec = c.skipSecPerEp || 0;
    const minutesWithoutSkip = remainingEps * dur;
    const minutesWithSkip = Math.max(
      0,
      remainingEps * (dur - skipSec / 60),
    );

    const fitsWithoutSkip = minutesWithoutSkip <= availableMin + 0.5;
    const fitsWithSkip = minutesWithSkip <= availableMin + 0.5;

    let reason: string;
    if (fitsWithoutSkip) {
      reason = `Full remaining run fits (~${Math.round(minutesWithoutSkip)} min)`;
    } else if (fitsWithSkip && preferSkip) {
      reason = `Fits if you skip OP/ED (~${Math.round(minutesWithSkip)} min)`;
    } else if (remainingEps > 1) {
      const epFit = Math.max(
        1,
        Math.floor(availableMin / Math.max(1, dur - (preferSkip ? skipSec / 60 : 0))),
      );
      reason = `About ${Math.min(epFit, remainingEps)} ep in your window`;
    } else {
      reason = `Needs ~${Math.round(minutesWithoutSkip)} min for remaining eps`;
    }

    picks.push({
      ...c,
      remainingEps,
      minutesWithoutSkip,
      minutesWithSkip,
      fitsWithoutSkip,
      fitsWithSkip,
      reason,
    });
  }

  picks.sort((a, b) => {
    const score = (p: TonightPick) => {
      if (p.fitsWithoutSkip) return 300 - p.minutesWithoutSkip;
      if (p.fitsWithSkip) return 200 - p.minutesWithSkip;
      return 100 - Math.min(p.minutesWithoutSkip, 999);
    };
    return score(b) - score(a);
  });

  return picks;
}
