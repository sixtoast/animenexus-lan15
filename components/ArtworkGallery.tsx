"use client";

import { useState } from "react";
import type { ArtworkAsset } from "@/lib/deep-metadata";

type Props = {
  assets: ArtworkAsset[];
  /** AniList cover stays primary — this is extra only */
  sourceNote?: string;
};

export function ArtworkGallery({ assets, sourceNote }: Props) {
  const [open, setOpen] = useState(false);

  if (!assets.length) return null;

  const posters = assets.filter((a) => a.type === "poster");
  const backgrounds = assets.filter((a) => a.type === "background");
  const logos = assets.filter((a) => a.type === "logo");
  const rest = assets.filter(
    (a) => !["poster", "background", "logo"].includes(a.type),
  );

  return (
    <section className="detail-section" aria-labelledby="artwork-heading">
      <h2 id="artwork-heading">Supplemental artwork</h2>
      <p className="tools-hint" style={{ marginBottom: 10 }}>
        Fan community art — does not replace the catalog cover.
        {sourceNote ? ` · ${sourceNote}` : ""}
      </p>
      <button
        type="button"
        className="btn btn-outline btn-sm"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
      >
        {open ? "Hide gallery" : `Show gallery (${assets.length})`}
      </button>
      {open ? (
        <div style={{ marginTop: 14 }}>
          <Group label="Posters" items={posters} />
          <Group label="Backgrounds" items={backgrounds} />
          <Group label="Logos" items={logos} />
          <Group label="Other" items={rest} />
        </div>
      ) : null}
    </section>
  );
}

function Group({ label, items }: { label: string; items: ArtworkAsset[] }) {
  if (!items.length) return null;
  return (
    <div style={{ marginBottom: 16 }}>
      <h3 className="theme-sub">{label}</h3>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(120px, 1fr))",
          gap: 10,
        }}
      >
        {items.map((a) => (
          <a
            key={a.url}
            href={a.url}
            target="_blank"
            rel="noreferrer"
            style={{ display: "block" }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={a.url.replace(
                "assets.fanart.tv/fanart/",
                "assets.fanart.tv/preview/",
              )}
              alt=""
              loading="lazy"
              style={{
                width: "100%",
                height: "auto",
                borderRadius: 8,
                background: "var(--color-surface)",
              }}
            />
            <span className="tools-hint">
              {a.language || a.type}
              {a.likes != null ? ` · ♥ ${a.likes}` : ""}
            </span>
          </a>
        ))}
      </div>
    </div>
  );
}
