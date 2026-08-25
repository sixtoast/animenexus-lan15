"use client";

import { useEffect, useMemo, useState } from "react";

type Props = {
  episodes: number;
  duration: number;
  title: string;
  /** MAL id enables AniSkip-based OP/ED estimates */
  malId?: number | null;
};

type SkipAvg = {
  op: number;
  ed: number;
  recap: number;
  sampled: number;
};

export function BingeCalculator({
  episodes,
  duration,
  title,
  malId,
}: Props) {
  const eps = episodes > 0 ? episodes : 12;
  const mins = duration > 0 ? duration : 24;
  const [hoursPerDay, setHoursPerDay] = useState(2);
  const [displayHours, setDisplayHours] = useState(0);
  const [skipOp, setSkipOp] = useState(true);
  const [skipEd, setSkipEd] = useState(true);
  const [skipRecap, setSkipRecap] = useState(false);
  const [skipAvg, setSkipAvg] = useState<SkipAvg | null>(null);
  const [skipNote, setSkipNote] = useState<string | null>(null);

  useEffect(() => {
    if (!malId || malId < 1) {
      setSkipAvg(null);
      setSkipNote(null);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(
          `/api/skip-estimate?malId=${malId}&episodes=${eps}`,
        );
        const j = await res.json();
        if (cancelled) return;
        if (j.sampled > 0) {
          setSkipAvg({
            op: j.op || 0,
            ed: j.ed || 0,
            recap: j.recap || 0,
            sampled: j.sampled,
          });
          setSkipNote(`AniSkip sample · ${j.sampled} ep`);
        } else {
          setSkipAvg(null);
          setSkipNote("No AniSkip data for this title yet");
        }
      } catch {
        if (!cancelled) {
          setSkipAvg(null);
          setSkipNote("Skip estimates unavailable");
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [malId, eps]);

  const skipPerEpSec = useMemo(() => {
    if (!skipAvg) return 0;
    let s = 0;
    if (skipOp) s += skipAvg.op;
    if (skipEd) s += skipAvg.ed;
    if (skipRecap) s += skipAvg.recap;
    return s;
  }, [skipAvg, skipOp, skipEd, skipRecap]);

  const result = useMemo(() => {
    const baseMin = eps * mins;
    const skipMin = (skipPerEpSec * eps) / 60;
    const totalMin = Math.max(0, baseMin - skipMin);
    const totalHours = totalMin / 60;
    const days =
      hoursPerDay > 0 ? Math.ceil(totalHours / hoursPerDay) : totalHours;
    return {
      totalMin,
      totalHours,
      days,
      baseHours: baseMin / 60,
      savedHours: skipMin / 60,
    };
  }, [eps, mins, hoursPerDay, skipPerEpSec]);

  useEffect(() => {
    const from = displayHours;
    const to = result.totalHours;
    if (Math.abs(from - to) < 0.01) {
      setDisplayHours(to);
      return;
    }
    const start = performance.now();
    const dur = 320;
    let raf = 0;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / dur);
      const eased = 1 - (1 - t) * (1 - t);
      setDisplayHours(from + (to - from) * eased);
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [result.totalHours]);

  const paceFill = Math.min(100, (hoursPerDay / 8) * 100);

  return (
    <div className="binge-box">
      <h3 className="binge-title">Binge calculator</h3>
      <p className="binge-meta">
        {eps} ep × {mins} min · “{title}”
      </p>
      <div className="binge-row">
        <label htmlFor="binge-hours">Hours / day</label>
        <input
          id="binge-hours"
          type="number"
          min={0.5}
          max={24}
          step={0.5}
          value={hoursPerDay}
          onChange={(e) =>
            setHoursPerDay(Math.max(0.5, parseFloat(e.target.value) || 0.5))
          }
        />
      </div>

      {malId ? (
        <div className="binge-skip-opts" style={{ marginTop: 10 }}>
          <p className="tools-hint" style={{ marginBottom: 6 }}>
            Skip estimates (AniSkip)
            {skipNote ? ` · ${skipNote}` : null}
          </p>
          <label style={{ display: "block", fontSize: "0.85rem" }}>
            <input
              type="checkbox"
              checked={skipOp}
              onChange={(e) => setSkipOp(e.target.checked)}
              disabled={!skipAvg}
            />{" "}
            Opening
            {skipAvg?.op
              ? ` (~${Math.round(skipAvg.op)}s/ep)`
              : ""}
          </label>
          <label style={{ display: "block", fontSize: "0.85rem" }}>
            <input
              type="checkbox"
              checked={skipEd}
              onChange={(e) => setSkipEd(e.target.checked)}
              disabled={!skipAvg}
            />{" "}
            Ending
            {skipAvg?.ed
              ? ` (~${Math.round(skipAvg.ed)}s/ep)`
              : ""}
          </label>
          <label style={{ display: "block", fontSize: "0.85rem" }}>
            <input
              type="checkbox"
              checked={skipRecap}
              onChange={(e) => setSkipRecap(e.target.checked)}
              disabled={!skipAvg}
            />{" "}
            Recap
            {skipAvg?.recap
              ? ` (~${Math.round(skipAvg.recap)}s/ep)`
              : ""}
          </label>
        </div>
      ) : null}

      <div className="binge-timeline" aria-hidden>
        <span className="binge-timeline-fill" style={{ width: `${paceFill}%` }} />
      </div>
      <p className="binge-result">
        About{" "}
        <strong className="binge-hours-num">
          {displayHours.toFixed(1)} hours
        </strong>{" "}
        total —{" "}
        <strong>
          {result.days === 1 ? "1 day" : `${result.days} days`}
        </strong>{" "}
        at this pace.
      </p>
      {result.savedHours > 0.05 ? (
        <p className="tools-hint">
          Full runtime ~{result.baseHours.toFixed(1)}h · skips save ~
          {result.savedHours.toFixed(1)}h (estimate).
        </p>
      ) : null}
    </div>
  );
}
