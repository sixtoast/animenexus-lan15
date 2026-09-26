"use client";

import { useEffect, useMemo, useState } from "react";
import type { ArtworkAsset } from "@/lib/deep-metadata";

type Props = {
  assets: ArtworkAsset[];
  animeId: number;
  sourceNote?: string;
};

type ArtworkGroup = {
  id: string;
  label: string;
  description: string;
  types: ArtworkAsset["type"][];
};

const GROUPS: ArtworkGroup[] = [
  { id: "alternate", label: "Alternate covers & key visuals", description: "Poster variants and alternate promotional artwork.", types: ["alternate", "poster"] },
  { id: "world", label: "World & promotional", description: "Backgrounds, banners and wide-format artwork.", types: ["background", "banner"] },
  { id: "characters", label: "Character & clear art", description: "Character renders, transparent art and cut-out assets.", types: ["clearart"] },
  { id: "stills", label: "Scene stills", description: "Frames and screenshots from the series.", types: ["still"] },
  { id: "identity", label: "Logos & identity", description: "Series logos and branding assets.", types: ["logo"] },
  { id: "other", label: "Other artwork", description: "Artwork that does not fit the supported categories above.", types: ["other"] },
];

function sortAssets(items: ArtworkAsset[]) {
  return [...items].sort((a, b) => {
    const likes = (b.likes ?? -1) - (a.likes ?? -1);
    if (likes !== 0) return likes;
    return (b.width ?? 0) * (b.height ?? 0) - (a.width ?? 0) * (a.height ?? 0);
  });
}

const COVER_KEY_PREFIX = "animenexus:artwork-cover:";
const COVER_EVENT = "animenexus:artwork-selected";

export function ArtworkGallery({ assets, animeId, sourceNote }: Props) {
  const [open, setOpen] = useState(false);
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({});
  const [selectedCover, setSelectedCover] = useState<string | null>(null);

  const coverKey = `${COVER_KEY_PREFIX}${animeId}`;

  function chooseCover(url: string) {
    try {
      window.localStorage.setItem(coverKey, url);
      setSelectedCover(url);
      window.dispatchEvent(new CustomEvent(COVER_EVENT, { detail: { animeId, url } }));
    } catch {
      // Storage can be unavailable in privacy-restricted browsers.
    }
  }

  function clearCover() {
    try {
      window.localStorage.removeItem(coverKey);
      setSelectedCover(null);
      window.dispatchEvent(new CustomEvent(COVER_EVENT, { detail: { animeId, url: null } }));
    } catch {
      // Storage can be unavailable in privacy-restricted browsers.
    }
  }

  useEffect(() => {
    try {
      setSelectedCover(window.localStorage.getItem(coverKey));
    } catch {
      setSelectedCover(null);
    }
  }, [coverKey]);

  const groups = useMemo(
    () => GROUPS.map((group) => ({
      ...group,
      items: sortAssets(assets.filter((asset) => group.types.includes(asset.type))),
    })).filter((group) => group.items.length > 0),
    [assets],
  );

  if (!assets.length) return null;

  const totalGrouped = groups.reduce((sum, group) => sum + group.items.length, 0);
  const unclassified = assets.length - totalGrouped;

  return (
    <section className="detail-section artwork-gallery" aria-labelledby="artwork-heading">
      <div className="artwork-gallery__header">
        <div>
          <h2 id="artwork-heading">Supplemental artwork</h2>
          <p className="tools-hint artwork-gallery__intro">
            Alternate artwork is organised by purpose. Choose any alternate cover or poster to make it your personal cover on this device.
            {sourceNote ? ` · Source: ${sourceNote}` : ""}
          </p>
        </div>
        <button type="button" className="btn btn-outline btn-sm" onClick={() => setOpen((value) => !value)} aria-expanded={open} aria-controls="artwork-gallery-content">
          {open ? "Hide gallery" : `Explore artwork · ${assets.length}`}
        </button>
      </div>

      {open ? (
        <div id="artwork-gallery-content" className="artwork-gallery__content">
          {selectedCover ? (
            <div className="artwork-gallery__selection">
              <span>Custom cover selected for this device.</span>
              <button type="button" className="btn btn-outline btn-sm" onClick={clearCover}>Restore catalog cover</button>
            </div>
          ) : null}
          <div className="artwork-gallery__index" aria-label="Artwork categories">
            {groups.map((group) => (
              <button key={group.id} type="button" className="artwork-gallery__index-item" onClick={() => setOpenGroups((current) => ({ ...current, [group.id]: true }))}>
                <span>{group.label}</span><span>{group.items.length}</span>
              </button>
            ))}
          </div>

          <div className="artwork-gallery__groups">
            {groups.map((group) => {
              const expanded = openGroups[group.id] ?? true;
              return (
                <section key={group.id} className="artwork-gallery__group" aria-labelledby={`artwork-group-${group.id}`}>
                  <button type="button" className="artwork-gallery__group-heading" onClick={() => setOpenGroups((current) => ({ ...current, [group.id]: !expanded }))} aria-expanded={expanded}>
                    <span>
                      <strong id={`artwork-group-${group.id}`}>{group.label}</strong>
                      <small>{group.description}</small>
                    </span>
                    <span className="artwork-gallery__count">{group.items.length}<span aria-hidden="true">{expanded ? "−" : "+"}</span></span>
                  </button>
                  {expanded ? <ArtworkGrid items={group.items} selectedCover={selectedCover} onChooseCover={chooseCover} /> : null}
                </section>
              );
            })}
          </div>

          {unclassified > 0 ? (
            <p className="tools-hint artwork-gallery__unclassified">
              {unclassified} artwork item{unclassified === 1 ? "" : "s"} could not be classified and remain available in the source collection.
            </p>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}

function ArtworkGrid({
  items,
  selectedCover,
  onChooseCover,
}: {
  items: ArtworkAsset[];
  selectedCover: string | null;
  onChooseCover: (url: string) => void;
}) {
  return (
    <div className="artwork-gallery__grid">
      {items.map((asset, index) => {
        const preview = asset.url.replace("assets.fanart.tv/fanart/", "assets.fanart.tv/preview/");
        const label = asset.language || asset.type;
        const dimensions = asset.width && asset.height ? `${asset.width} × ${asset.height}` : null;

        const canSelect = asset.type === "alternate" || asset.type === "poster";
        const isSelected = selectedCover === asset.url;

        return (
          <div key={`${asset.url}-${index}`} className={`artwork-gallery__item${isSelected ? " is-selected" : ""}`}>
            <a href={asset.url} target="_blank" rel="noreferrer" className="artwork-gallery__link" aria-label={`Open artwork, ${label}`}>
            <span className="artwork-gallery__media">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={preview} alt="" loading="lazy" />
            </span>
            <span className="artwork-gallery__meta">
              <span>{label}</span>
              {asset.likes != null ? <span>♥ {asset.likes}</span> : null}
              {dimensions ? <span>{dimensions}</span> : null}
            </span>
            </a>
            {canSelect ? (
              <button
                type="button"
                className="artwork-gallery__choose"
                onClick={() => onChooseCover(asset.url)}
                aria-pressed={isSelected}
              >
                {isSelected ? "✓ Using as cover" : "Use as cover"}
              </button>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}
