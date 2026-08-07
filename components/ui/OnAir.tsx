"use client";

type Props = {
  label?: string;
  tone?: "live" | "accent";
  className?: string;
};

/** Shared “on air / live signal” chip */
export function OnAir({
  label = "On air",
  tone = "live",
  className,
}: Props) {
  return (
    <span
      className={
        "nx-on-air nx-on-air-" +
        tone +
        (className ? " " + className : "")
      }
    >
      <span className="nx-on-air-dot" aria-hidden />
      <span className="nx-on-air-label">{label}</span>
    </span>
  );
}
