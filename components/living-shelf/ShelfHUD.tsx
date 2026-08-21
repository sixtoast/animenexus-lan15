"use client";

import Link from "next/link";
import type { ShelfObject } from "@/lib/living-shelf";
import { SHELF_CLUSTER_LABELS } from "@/lib/living-shelf";
import { AnimeImage } from "@/components/AnimeImage";
import { getAnimeViewTransitionName } from "@/lib/view-transition";

export function ShelfHUD({
  selected,
  onClose,
  onResetCamera,
}: {
  selected: ShelfObject | null;
  onClose: () => void;
  onResetCamera: () => void;
}) {
  return (
    <div className="shelf-hud">
      <div className="shelf-hud-bar">
        <button type="button" className="btn btn-outline btn-sm" onClick={onResetCamera}>
          Reset view
        </button>
        <span className="tools-hint" style={{ margin: 0 }}>
          Drag to orbit · scroll to zoom · click a poster to inspect
        </span>
      </div>

      {selected ? (
        <aside
          className="shelf-inspect"
          aria-label={`Selected: ${selected.title}`}
        >
          <button
            type="button"
            className="shelf-inspect-close"
            onClick={onClose}
            aria-label="Close inspection"
          >
            ×
          </button>
          <AnimeImage
            src={selected.image}
            title={selected.title}
            decorative
            width={120}
            height={180}
            sizes="120px"
            viewTransitionName={getAnimeViewTransitionName(selected.animeId)}
          />
          <div className="shelf-inspect-body">
            <p className="nx-kicker">{SHELF_CLUSTER_LABELS[selected.cluster]}</p>
            <h3>{selected.title}</h3>
            <p className="tools-hint">
              Progress {selected.progress}
              {selected.progressRatio > 0
                ? ` · ${Math.round(selected.progressRatio * 100)}%`
                : ""}
              {selected.userRating > 0
                ? ` · Your score ${selected.userRating}`
                : ""}
            </p>
            <div className="shelf-inspect-actions">
              <Link
                href={`/anime/${selected.animeId}`}
                className="btn btn-accent btn-sm"
              >
                Open detail
              </Link>
              <button
                type="button"
                className="btn btn-outline btn-sm"
                onClick={onClose}
              >
                Back to shelf
              </button>
            </div>
          </div>
        </aside>
      ) : null}
    </div>
  );
}
