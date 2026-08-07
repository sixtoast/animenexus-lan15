import type { Anime } from "@/lib/types";
import { AnimeCard } from "./AnimeCard";

type Props = {
  items: Anime[];
};

export function AnimeGrid({ items }: Props) {
  if (!items.length) {
    return (
      <div className="state-box">
        <p>No titles on this frequency yet.</p>
      </div>
    );
  }

  return (
    <div className="anime-grid">
      {items.map((a, i) => (
        <AnimeCard key={a.id} anime={a} index={i} />
      ))}
    </div>
  );
}
