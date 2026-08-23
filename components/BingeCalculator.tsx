"use client";

import { useEffect, useMemo, useState } from "react";

type Props = {
  episodes: number;
  duration: number;
  title: string;
};

export function BingeCalculator({ episodes, duration, title }: Props) {
  const eps = episodes > 0 ? episodes : 12;
  const mins = duration > 0 ? duration : 24;
  const [hoursPerDay, setHoursPerDay] = useState(2);
  const [displayHours, setDisplayHours] = useState(0);

  const result = useMemo(() => {
    const totalMin = eps * mins;
    const totalHours = totalMin / 60;
    const days =
      hoursPerDay > 0 ? Math.ceil(totalHours / hoursPerDay) : totalHours;
    return { totalMin, totalHours, days };
  }, [eps, mins, hoursPerDay]);

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
    // only animate when totalHours changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [result.totalHours]);

  // Timeline fill: how much of a "week binge" this pace represents (cap 100%)
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
    </div>
  );
}
