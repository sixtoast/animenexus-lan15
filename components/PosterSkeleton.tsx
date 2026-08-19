import { SignalBars } from "@/components/ui/SignalBars";
import {
  LOADING_COPY,
  loadingLabel,
  type LoadingContext,
} from "@/lib/loading-theatre";

type Props = {
  count?: number;
  /** Named theatre context or custom string */
  label?: LoadingContext | string;
};

export function PosterSkeleton({
  count = 12,
  label = "search",
}: Props) {
  const text = loadingLabel(label) || LOADING_COPY.default;
  return (
    <div className="poster-skel-wrap" role="status" aria-live="polite">
      <div className="tuning-row">
        <SignalBars level={3} animated />
        <p className="tuning-label">{text}</p>
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
