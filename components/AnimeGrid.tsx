import type { Anime } from "@/lib/types";
import { AnimeCard } from "./AnimeCard";
import { BehaviourTracker } from "./BehaviourTracker";

type Props = {
  items: Anime[];
  /** Log exposure / dwell for Preference Engine V2 */
  trackBehaviour?: boolean;
  shelf?: string;
  recommendationId?: string;
  source?: string;
};

export function AnimeGrid({
  items,
  trackBehaviour,
  shelf,
  recommendationId,
  source,
}: Props) {
  if (!items.length) {
    return (
      <div className="state-box">
        <p>No titles on this frequency yet.</p>
      </div>
    );
  }

  return (
    <div className="anime-grid">
      {items.map((a, i) => {
        const card = <AnimeCard key={a.id} anime={a} index={i} />;
        if (!trackBehaviour) return card;
        return (
          <BehaviourTracker
            key={a.id}
            animeId={a.id}
            position={i}
            shelf={shelf}
            recommendationId={recommendationId}
            source={source}
          >
            <AnimeCard anime={a} index={i} />
          </BehaviourTracker>
        );
      })}
    </div>
  );
}
