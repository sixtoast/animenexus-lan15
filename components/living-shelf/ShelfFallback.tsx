"use client";

import Link from "next/link";
import { AnimeImage } from "@/components/AnimeImage";
import {
  groupShelfByCluster,
  SHELF_CLUSTER_LABELS,
  type ShelfObject,
} from "@/lib/living-shelf";
import {
  getAnimeObjectId,
  getAnimeViewTransitionName,
} from "@/lib/view-transition";

/** Editorial 2D shelf when WebGL fails or reduced capability. */
export function ShelfFallback({
  objects,
  onSelect,
}: {
  objects: ShelfObject[];
  onSelect?: (id: number) => void;
}) {
  const groups = groupShelfByCluster(objects);

  return (
    <div className="shelf-fallback" role="region" aria-label="Shelf — list view">
      <p className="tools-hint">
        Spatial shelf unavailable — showing editorial clusters. Full manage
        controls remain on the Manage tab.
      </p>
      {(["watching", "planning", "paused", "completed", "dropped"] as const).map(
        (cluster) => {
          const list = groups[cluster];
          if (!list.length) return null;
          return (
            <section key={cluster} className="shelf-cluster-preview">
              <h3 className="nx-kicker">
                {SHELF_CLUSTER_LABELS[cluster]}{" "}
                <span className="wl-count">{list.length}</span>
              </h3>
              <ul className="shelf-cluster-grid">
                {list.map((o) => (
                  <li
                    key={o.animeId}
                    data-anime-object-id={getAnimeObjectId(o.animeId)}
                  >
                    <Link
                      href={`/anime/${o.animeId}`}
                      className="shelf-obj-link"
                      onClick={() => onSelect?.(o.animeId)}
                    >
                      <AnimeImage
                        src={o.image}
                        title={o.title}
                        decorative
                        width={96}
                        height={144}
                        sizes="96px"
                        viewTransitionName={getAnimeViewTransitionName(
                          o.animeId,
                        )}
                      />
                      <span className="shelf-obj-title">{o.title}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          );
        },
      )}
    </div>
  );
}
