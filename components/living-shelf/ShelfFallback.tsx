"use client";

import { useMemo, useState } from "react";
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
  const groups = useMemo(() => groupShelfByCluster(objects), [objects]);
  const [focusId, setFocusId] = useState<number | null>(null);

  return (
    <div className="shelf-fallback" role="region" aria-label="Shelf — list view">
      <p className="tools-hint">
        Spatial shelf unavailable — showing editorial clusters. Full manage
        controls remain on the <strong>Manage</strong> tab.
      </p>
      {(["watching", "planning", "paused", "completed", "dropped"] as const).map(
        (cluster) => {
          const list = groups[cluster];
          if (!list.length) return null;
          return (
            <section
              key={cluster}
              className="shelf-cluster-preview"
              aria-labelledby={`shelf-cluster-${cluster}`}
            >
              <h3 className="nx-kicker" id={`shelf-cluster-${cluster}`}>
                {SHELF_CLUSTER_LABELS[cluster]}{" "}
                <span className="wl-count">{list.length}</span>
              </h3>
              <ul className="shelf-cluster-grid">
                {list.map((o) => (
                  <li
                    key={o.animeId}
                    data-anime-object-id={getAnimeObjectId(o.animeId)}
                  >
                    <div className="shelf-obj-block">
                      <Link
                        href={`/anime/${o.animeId}`}
                        className="shelf-obj-link"
                        aria-label={`${o.title}, ${SHELF_CLUSTER_LABELS[o.cluster]}, progress ${o.progress}`}
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
                      {onSelect ? (
                        <button
                          type="button"
                          className={
                            "btn btn-outline btn-sm shelf-obj-select" +
                            (focusId === o.animeId ? " is-active" : "")
                          }
                          aria-pressed={focusId === o.animeId}
                          onClick={() => {
                            setFocusId(o.animeId);
                            onSelect(o.animeId);
                          }}
                        >
                          Select
                        </button>
                      ) : null}
                    </div>
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
