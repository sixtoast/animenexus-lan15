"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import type { AnimeRelation, GraphNode } from "@/lib/types";
import { AncestrySpace2D } from "@/components/AncestrySpace2D";

type Props = {
  centerTitle: string;
  centerId: number;
  centerImage?: string;
  centerYear?: number | string | null;
  relations: AnimeRelation[];
};

const SIDE = new Set(["SPIN_OFF", "ALTERNATIVE", "SUMMARY", "OTHER", "CHARACTER"]);

function labelType(t: string) {
  return t.replace(/_/g, " ").toLowerCase().replace(/^\w/, (c) => c.toUpperCase());
}

function badgeClass(t: string) {
  const u = t.toUpperCase();
  if (u === "SEQUEL") return "ab-sequel";
  if (u === "PREQUEL" || u === "PARENT") return "ab-prequel";
  if (u === "SIDE_STORY") return "ab-side";
  if (u === "SPIN_OFF") return "ab-spin";
  if (u === "RECOMMENDED") return "ab-rec";
  return "ab-other";
}

function PosterCard({
  href,
  title,
  image,
  meta,
  badge,
  badgeType,
  current,
}: {
  href?: string;
  title: string;
  image?: string;
  meta?: string;
  badge?: string;
  badgeType?: string;
  current?: boolean;
}) {
  const body = (
    <>
      <div className="ab-poster">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={image || "https://placehold.co/200x300/1a1a1a/555?text=?"}
          alt=""
          loading="lazy"
        />
        {badge ? (
          <span className={"ab-badge " + badgeClass(badgeType || badge)}>
            {badge}
          </span>
        ) : null}
        {current ? <span className="ab-you">You are here</span> : null}
      </div>
      <div className="ab-card-title">{title}</div>
      {meta ? <div className="ab-card-meta">{meta}</div> : null}
    </>
  );

  if (current || !href) {
    return <div className={"ab-card" + (current ? " ab-current" : "")}>{body}</div>;
  }
  return (
    <Link href={href} className="ab-card">
      {body}
    </Link>
  );
}

export function AncestryGraph({
  centerTitle,
  centerId,
  centerImage,
  centerYear,
  relations: initial,
}: Props) {
  const [relations, setRelations] = useState<AnimeRelation[]>(initial || []);
  const [loading, setLoading] = useState(false);
  const [showFlat, setShowFlat] = useState(false);

  useEffect(() => {
    if (initial?.length) {
      setRelations(initial);
      return;
    }
    let cancelled = false;
    setLoading(true);
    fetch(`/api/relations?id=${centerId}&deep=0`)
      .then((r) => r.json())
      .then((j) => {
        if (!cancelled && Array.isArray(j.data)) setRelations(j.data);
        else if (!cancelled && Array.isArray(j.nodes)) setRelations(j.nodes);
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [centerId, initial]);

  const seedNodes: GraphNode[] = useMemo(() => {
    return relations.map((r) => ({
      ...r,
      depth: 0,
      layer:
        (r.relationType || "").toUpperCase() === "RECOMMENDED"
          ? ("recommended" as const)
          : ("official" as const),
    }));
  }, [relations]);

  const { timeline, sideOrbit, recommended } = useMemo(() => {
    const prequels: AnimeRelation[] = [];
    const sequels: AnimeRelation[] = [];
    const sides: AnimeRelation[] = [];
    const orbit: AnimeRelation[] = [];
    const recs: AnimeRelation[] = [];

    for (const r of relations) {
      const t = (r.relationType || "").toUpperCase();
      if (t === "PREQUEL" || t === "PARENT") prequels.push(r);
      else if (t === "SEQUEL") sequels.push(r);
      else if (t === "SIDE_STORY") sides.push(r);
      else if (SIDE.has(t)) orbit.push(r);
      else if (t === "RECOMMENDED") recs.push(r);
      else sides.push(r);
    }

    const byYear = (a: AnimeRelation, b: AnimeRelation) =>
      (a.year || 0) - (b.year || 0) || a.title.localeCompare(b.title);

    prequels.sort(byYear);
    sequels.sort(byYear);

    return {
      timeline: [
        ...prequels.map((r) => ({
          id: r.id,
          title: r.title,
          image: r.image,
          year: r.year,
          score: r.score,
          badge: labelType(r.relationType),
          badgeType: r.relationType,
        })),
        {
          id: centerId,
          title: centerTitle,
          image: centerImage,
          year: centerYear,
          current: true as const,
        },
        ...sequels.map((r) => ({
          id: r.id,
          title: r.title,
          image: r.image,
          year: r.year,
          score: r.score,
          badge: labelType(r.relationType),
          badgeType: r.relationType,
        })),
      ],
      sideOrbit: [...sides, ...orbit].sort(byYear),
      recommended: recs,
    };
  }, [relations, centerId, centerTitle, centerImage, centerYear]);

  const officialCount = relations.filter(
    (r) => (r.relationType || "").toUpperCase() !== "RECOMMENDED",
  ).length;

  const showMap = relations.length > 0 || loading;

  return (
    <section className="detail-section ancestry-section" id="ancestry">
      <div className="ab-header">
        <div>
          <p className="ab-kicker">Map</p>
          <h2>Ancestry</h2>
          <p className="ancestry-lead">
            {loading
              ? "Charting links…"
              : relations.length
                ? `${officialCount} official · recommendations expand into a chain with physics`
                : "No linked anime found for this title."}
          </p>
        </div>
        {relations.length > 0 ? (
          <button
            type="button"
            className="btn btn-outline btn-sm"
            onClick={() => setShowFlat((v) => !v)}
          >
            {showFlat ? "Hide list" : "List view"}
          </button>
        ) : null}
      </div>

      {showMap ? (
        <AncestrySpace2D
          center={{
            id: centerId,
            title: centerTitle,
            image: centerImage,
            year: centerYear,
          }}
          seedNodes={seedNodes}
        />
      ) : null}

      {showFlat ? (
        <div className="ab-flat">
          {timeline.length > 1 ? (
            <div className="ab-block">
              <h3 className="ab-block-title">Story line</h3>
              <div className="ab-timeline">
                {timeline.map((n, i) => (
                  <div key={`${n.id}-${i}`} className="ab-timeline-item">
                    {i > 0 ? <div className="ab-connector" aria-hidden /> : null}
                    <PosterCard
                      href={
                        "current" in n && n.current
                          ? undefined
                          : `/anime/${n.id}`
                      }
                      title={n.title}
                      image={n.image}
                      current={"current" in n && n.current}
                      badge={"badge" in n ? n.badge : undefined}
                      badgeType={"badgeType" in n ? n.badgeType : undefined}
                      meta={[
                        n.year ? String(n.year) : null,
                        "score" in n && n.score != null
                          ? `★ ${n.score.toFixed(1)}`
                          : null,
                      ]
                        .filter(Boolean)
                        .join(" · ")}
                    />
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          {sideOrbit.length > 0 ? (
            <div className="ab-block">
              <h3 className="ab-block-title">Side stories</h3>
              <div className="ab-grid">
                {sideOrbit.map((r) => (
                  <PosterCard
                    key={`${r.id}-${r.relationType}`}
                    href={`/anime/${r.id}`}
                    title={r.title}
                    image={r.image}
                    badge={labelType(r.relationType)}
                    badgeType={r.relationType}
                    meta={[r.format, r.year ? String(r.year) : null]
                      .filter(Boolean)
                      .join(" · ")}
                  />
                ))}
              </div>
            </div>
          ) : null}

          {recommended.length > 0 ? (
            <div className="ab-block">
              <h3 className="ab-block-title">Similar</h3>
              <div className="ab-grid">
                {recommended.map((r) => (
                  <PosterCard
                    key={`rec-${r.id}`}
                    href={`/anime/${r.id}`}
                    title={r.title}
                    image={r.image}
                    badge="Similar"
                    badgeType="RECOMMENDED"
                    meta={[r.format, r.year ? String(r.year) : null]
                      .filter(Boolean)
                      .join(" · ")}
                  />
                ))}
              </div>
            </div>
          ) : null}
        </div>
      ) : null}

      {!loading && !relations.length ? (
        <p className="tools-hint" style={{ marginTop: 8 }}>
          Try a multi-season franchise for a fuller map.
        </p>
      ) : null}
    </section>
  );
}
