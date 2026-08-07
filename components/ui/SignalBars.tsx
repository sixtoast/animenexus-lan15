"use client";

type Props = {
  /** 1–5 visual strength */
  level?: number;
  animated?: boolean;
  className?: string;
  label?: string;
};

/** Broadcast-style signal strength meter */
export function SignalBars({
  level = 4,
  animated = true,
  className,
  label,
}: Props) {
  const n = Math.max(1, Math.min(5, level));
  return (
    <div
      className={
        "nx-signal-bars" +
        (animated ? " is-live" : "") +
        (className ? " " + className : "")
      }
      role="img"
      aria-label={label || `Signal strength ${n} of 5`}
    >
      {[1, 2, 3, 4, 5].map((i) => (
        <span
          key={i}
          className={
            "nx-signal-bar" + (i <= n ? " is-on" : "")
          }
          style={{ "--bar-i": i } as React.CSSProperties}
        />
      ))}
    </div>
  );
}
