import { SignalBars } from "@/components/ui/SignalBars";

type Props = {
  count?: number;
  label?: string;
};

export function PosterSkeleton({
  count = 12,
  label = "Tuning the frequency…",
}: Props) {
  return (
    <div className="poster-skel-wrap">
      <div className="tuning-row">
        <SignalBars level={3} animated />
        <p className="tuning-label">{label}</p>
      </div>
      <div className="poster-skel-grid" aria-hidden>
        {Array.from({ length: count }).map((_, i) => (
          <div
            key={i}
            className="poster-skel"
            style={{ "--i": i } as React.CSSProperties}
          />
        ))}
      </div>
    </div>
  );
}
