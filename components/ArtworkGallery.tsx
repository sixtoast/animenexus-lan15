"use client";

import { useEffect, useMemo, useState } from "react";
import type { ArtworkAsset } from "@/lib/deep-metadata";

type Props = {
  assets: ArtworkAsset[];
  animeId: number;
  sourceNote?: string;
  animeImage?: string;
  bannerImage?: string | null;
};

type ArtworkGroup = {
  id: NonNullable<ArtworkAsset["role"]>;
  label: string;
  description: string;
  types: ArtworkAsset["type"][];
};

const GROUPS: ArtworkGroup[] = [
  { id: "key-art", label: "KEY ART", description: "Primary visual identity for the title.", types: ["poster"] },
  { id: "alternate-art", label: "ALTERNATE ART", description: "Alternate covers and key visuals.", types: ["alternate"] },
  { id: "character-art", label: "CHARACTER ART", description: "Character renders and clear art.", types: ["clearart"] },
  { id: "background-art", label: "BACKGROUND ART", description: "Wide environments, banners and atmospheric imagery.", types: ["background", "banner"] },
  { id: "stills", label: "STILLS", description: "Scene frames and screenshots.", types: ["still"] },
  { id: "logos", label: "LOGOS", description: "Series marks and identity assets.", types: ["logo"] },
  { id: "promotional", label: "PROMOTIONAL", description: "Campaign and promotional visuals.", types: [] },
  { id: "other", label: "OTHER", description: "Assets without a more specific visual role.", types: ["other"] },
];

function assetRole(asset: ArtworkAsset): NonNullable<ArtworkAsset["role"]> {
  if (asset.role) return asset.role;
  if (asset.type === "poster") return "key-art";
  if (asset.type === "alternate") return "alternate-art";
  if (asset.type === "clearart") return "character-art";
  if (asset.type === "background" || asset.type === "banner") return "background-art";
  if (asset.type === "still") return "stills";
  if (asset.type === "logo") return "logos";
  return "other";
}

function sortAssets(items: ArtworkAsset[]) {
  return [...items].sort((a, b) => {
    const likes = (b.likes ?? -1) - (a.likes ?? -1);
    if (likes !== 0) return likes;
    return (b.width ?? 0) * (b.height ?? 0) - (a.width ?? 0) * (a.height ?? 0);
  });
}

const COVER_KEY_PREFIX = "animenexus:artwork-cover:";
const COVER_EVENT = "animenexus:artwork-selected";

export function ArtworkGallery({ assets, animeId, sourceNote, animeImage, bannerImage }: Props) {
  const [open, setOpen] = useState(false);
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({});
  const [selectedCover, setSelectedCover] = useState<string | null>(null);
  const [selectedRole, setSelectedRole] = useState<NonNullable<ArtworkAsset["role"]>>("key-art");

  const coverKey = `${COVER_KEY_PREFIX}${animeId}`;

  function chooseCover(url: string) {
    try {
      window.localStorage.setItem(coverKey, url);
      setSelectedCover(url);
      const asset = assets.find((item) => item.url === url);
      const role = asset ? assetRole(asset) : "alternate-art";
      setSelectedRole(role);
      window.dispatchEvent(new CustomEvent(COVER_EVENT, { detail: { animeId, url, role } }));
    } catch {
      // Storage can be unavailable in privacy-restricted browsers.
    }
  }

  function clearCover() {
    try {
      window.localStorage.removeItem(coverKey);
      setSelectedCover(null);
      setSelectedRole("key-art");
      window.dispatchEvent(new CustomEvent(COVER_EVENT, { detail: { animeId, url: null, role: "key-art" } }));
    } catch {
      // Storage can be unavailable in privacy-restricted browsers.
    }
  }

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(coverKey);
      setSelectedCover(stored);
      const asset = stored ? assets.find((item) => item.url === stored) : null;
      setSelectedRole(asset ? assetRole(asset) : "key-art");
    } catch {
      setSelectedCover(null);
    }
  }, [coverKey]);

  const groups = useMemo(
    () => GROUPS.map((group) => ({
      ...group,
      items: sortAssets(assets.filter((asset) => assetRole(asset) === group.id)),
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
        <div id="artwork-gallery-content" className="artwork-gallery__content" data-selected-role={selectedRole}>
          {selectedCover ? (
            <div className="artwork-gallery__selection">
              <span>{selectedRole === "alternate-art" ? "Alternate key visual is shaping this title's atmosphere." : "Custom key art selected for this device."}</span>
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

        const role = assetRole(asset);
        const canSelect = role === "key-art" || role === "alternate-art";
        const isSelected = selectedCover === asset.url;

        return (
          <div key={`${asset.url}-${index}`} className={`artwork-gallery__item${isSelected ? " is-selected" : ""}`} data-role={role}>
            <a href={asset.url} target="_blank" rel="noreferrer" className="artwork-gallery__link" aria-label={`Open artwork, ${label}`}>
            <span className="artwork-gallery__role">{role.replace("-", " ")}</span>
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
                {isSelected ? "✓ Use this atmosphere" : "Use this artwork"}
              </button>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}
