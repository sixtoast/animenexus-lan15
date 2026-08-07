"use client";

import { useMemo, useState } from "react";

type Props = {
  episodes: number;
  duration: number;
  title: string;
};

export function BingeCalculator({ episodes, duration, title }: Props) {
  const eps = episodes > 0 ? episodes : 12;
  const mins = duration > 0 ? duration : 24;
  const [hoursPerDay, setHoursPerDay] = useState(2);

  const result = useMemo(() => {
    const totalMin = eps * mins;
    const totalHours = totalMin / 60;
    const days =
      hoursPerDay > 0 ? Math.ceil(totalHours / hoursPerDay) : totalHours;
    return { totalMin, totalHours, days };
  }, [eps, mins, hoursPerDay]);

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
      <p className="binge-result">
        About <strong>{result.totalHours.toFixed(1)} hours</strong> total —{" "}
        <strong>
          {result.days === 1 ? "1 day" : `${result.days} days`}
        </strong>{" "}
        at this pace.
      </p>
    </div>
  );
}
