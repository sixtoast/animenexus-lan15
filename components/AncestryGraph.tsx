"use client";

import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { AnimeRelation, GraphNode } from "@/lib/types";
import { AncestrySpace2D } from "@/components/AncestrySpace2D";
import { getAnimeObjectId, withViewTransition } from "@/lib/view-transition";
import { playInteractionSound, playSpatialTravel } from "@/lib/sound-engine";

type Props = {
  centerTitle: string;
  centerId: number;
  centerImage?: string;
  centerYear?: number | string | null;
  relations: AnimeRelation[];
};

type WatchNode = {
  id?: number;
  title: string;
  image?: string;
  year?: number | string | null;
  format?: string;
  relationFromCenter?: string;
};

type WatchPath = {
  id: "release" | "chronological" | "main_story" | "completion";
  label: string;
  nodes: WatchNode[];
  uncertain: boolean;
  note?: string;
};

type WatchPlan = {
  center: WatchNode;
  paths: WatchPath[];
  relationCount: number;
};

const WATCH_RELATIONS = new Set([
  "SEQUEL",
  "PREQUEL",
  "PARENT",
  "FULL_STORY",
  "SIDE_STORY",
  "SPIN_OFF",
]);

const MAIN_RELATIONS = new Set([
  "SEQUEL",
  "PREQUEL",
  "PARENT",
  "FULL_STORY",
]);

function isWatchRelation(relationType?: string) {
  return WATCH_RELATIONS.has((relationType || "").toUpperCase());
}

function isMainRelation(relationType?: string) {
  return MAIN_RELATIONS.has((relationType || "").toUpperCase());
}

function labelType(t: string) {
  return t.replace(/_/g, " ").toLowerCase().replace(/^\w/, (c) => c.toUpperCase());
}

function badgeClass(t: string) {
  const u = t.toUpperCase();
  if (u === "SEQUEL") return "ab-sequel";
  if (u === "PREQUEL" || u === "PARENT") return "ab-prequel";
  if (u === "SIDE_STORY") return "ab-side";
  if (u === "SPIN_OFF") return "ab-spin";
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
    <AncestryLink
      href={href}
      title={title}
      objectId={href.split("/").pop() || ""}
    >
      {body}
    </AncestryLink>
  );
}

function AncestryLink({
  href,
  title,
  objectId,
  children,
}: {
  href: string;
  title: string;
  objectId: string;
  children: ReactNode;
}) {
  const router = useRouter();
  return (
    <Link
      href={href}
      className="ab-card"
      data-motion-origin="node"
      onClick={(event) => {
        if (
          event.metaKey ||
          event.ctrlKey ||
          event.shiftKey ||
          event.altKey ||
          event.button !== 0
        )
          return;
        event.preventDefault();
        const rect = event.currentTarget.getBoundingClientRect();
        const spatialX =
          ((rect.left + rect.width / 2) / Math.max(window.innerWidth, 1)) * 2 - 1;
        playInteractionSound("franchise", { gain: 0.72 });
        playSpatialTravel(spatialX, 0.28);
        withViewTransition(
          () => router.push(href),
          {
            route: "franchise",
            origin: "node",
            destination: "graph",
            objectId: getAnimeObjectId(objectId),
          },
        );
      }}
    >
      {children}
    </Link>
  );
}

function WatchCard({
  node,
  index,
  centerId,
  accent,
}: {
  node: WatchNode;
  index: number;
  centerId: number;
  accent?: boolean;
}) {
  const current = node.id === centerId;
  const relation = node.relationFromCenter?.toUpperCase();

  return (
    <div className={"wo-card-wrap" + (accent ? " wo-card-accent" : "")}>
      {index > 0 ? (
        <div className="wo-arrow" aria-hidden>
          <span />
          <b>›</b>
        </div>
      ) : null}
      <div className={"wo-card" + (current ? " wo-card-current" : "")}>
        {node.id != null ? (
          <Link
            href={current ? "#" : "/anime/" + node.id}
            className="wo-poster-link"
            aria-label={current ? node.title : "Open " + node.title}
            onClick={(event) => {
              if (current) event.preventDefault();
            }}
          >
            <div className="wo-poster">
              <img
                src={node.image || "https://placehold.co/220x330/1a1a1a/555?text=?"}
                alt=""
                loading="lazy"
              />
              {current ? <span className="wo-here">YOU ARE HERE</span> : null}
            </div>
          </Link>
        ) : null}
        <div className="wo-index">{String(index + 1).padStart(2, "0")}</div>
        {relation && !current ? (
          <span className="wo-relation">{labelType(relation)}</span>
        ) : null}
        <div className="wo-title">{node.title}</div>
        <div className="wo-meta">
          {[node.format, node.year ? String(node.year) : null].filter(Boolean).join(" · ")}
        </div>
      </div>
    </div>
  );
}

export function AncestryGraph({
  centerTitle,
  centerId,
  centerImage,
  centerYear,
  relations: initial,
}: Props) {
  const [relations, setRelations] = useState<AnimeRelation[]>(
    (initial || []).filter((r) => isWatchRelation(r.relationType)),
  );
  const [plan, setPlan] = useState<WatchPlan | null>(null);
  const [loading, setLoading] = useState(false);
  const [showMap, setShowMap] = useState(false);
  const [showFlat, setShowFlat] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    fetch("/api/watch-order?id=" + centerId, { cache: "no-store" })
      .then((r) => r.json())
      .then((j: WatchPlan & { graph?: { nodes?: GraphNode[] } }) => {
        if (cancelled) return;
        if (Array.isArray(j.paths)) setPlan(j);
        const official = (j.graph?.nodes || [])
          .filter((n) => n.layer !== "recommended" && isWatchRelation(n.relationType))
          .map((n) => n as AnimeRelation);
        if (official.length) setRelations(official);
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [centerId]);

  const centre = useMemo(
    () => ({
      id: centerId,
      title: centerTitle,
      image: centerImage,
      year: centerYear,
    }),
    [centerId, centerTitle, centerImage, centerYear],
  );

  const fallbackMain: WatchNode[] = useMemo(
    () =>
      [
        ...relations.filter((r) => isMainRelation(r.relationType)),
        {
          id: centerId,
          title: centerTitle,
          image: centerImage,
          year: centerYear,
        },
      ]
        .filter((n, i, arr) => arr.findIndex((x) => x.id === n.id) === i)
        .sort(
          (a, b) =>
            (Number(a.year) || 9999) - (Number(b.year) || 9999) ||
            a.title.localeCompare(b.title),
        ),
    [relations, centerId, centerTitle, centerImage, centerYear],
  );

  const mainPath = useMemo(() => {
    const fromPlan = plan?.paths.find((p) => p.id === "main_story")?.nodes;
    const source = fromPlan?.length ? fromPlan : fallbackMain;
    return source.map((n) => {
      if (n.id === centerId) {
        return {
          ...n,
          title: centerTitle,
          image: centerImage,
          year: centerYear,
        };
      }
      return n;
    });
  }, [plan, fallbackMain, centerId, centerTitle, centerImage, centerYear]);

  const allOfficial = useMemo(() => {
    const source =
      plan?.paths.find((p) => p.id === "completion")?.nodes || relations;
    const seen = new Set<number>();
    const out: WatchNode[] = [];

    for (const n of source) {
      if (n.id == null || seen.has(n.id) || !isWatchRelation(n.relationFromCenter)) continue;
      seen.add(n.id);
      out.push(n);
    }

    if (!seen.has(centerId)) {
      out.unshift(centre);
    }
    return out;
  }, [plan, relations, centerId, centre]);

  const sideNodes = useMemo(
    () =>
      allOfficial.filter((n) => {
        if (n.id === centerId) return false;
        const t = (n.relationFromCenter || "").toUpperCase();
        return t === "SIDE_STORY" || t === "SPIN_OFF";
      }),
    [allOfficial, centerId],
  );

  const mapSeedNodes: GraphNode[] = useMemo(
    () =>
      relations.map((r) => ({
        ...r,
        depth: 0,
        layer: "official" as const,
      })),
    [relations],
  );

  const officialCount = allOfficial.filter((n) => n.id !== centerId).length;
  const showMapSection = relations.length > 0 || loading;
  const hasStoryPath = mainPath.length > 1;
  const mainPathUncertain =
    plan?.paths.find((p) => p.id === "main_story")?.uncertain ?? !hasStoryPath;

  return (
    <section className="detail-section ancestry-section" id="ancestry">
      <div className="ab-header">
        <div>
          <p className="ab-kicker">Franchise</p>
          <h2>Watch order</h2>
          <p className="ancestry-lead">
            {loading
              ? "Tracing the official franchise…"
              : officialCount > 0
                ? officialCount + " official story links · recommendations excluded"
                : "No official franchise links found for this title."}
          </p>
        </div>
        {showMapSection ? (
          <div className="wo-actions">
            <button
              type="button"
              className="btn btn-outline btn-sm"
              onClick={() => setShowMap((v) => !v)}
            >
              {showMap ? "Watch path" : "Explore map"}
            </button>
            <button
              type="button"
              className="btn btn-outline btn-sm"
              onClick={() => setShowFlat((v) => !v)}
            >
              {showFlat ? "Hide list" : "List view"}
            </button>
          </div>
        ) : null}
      </div>

      {showMap && showMapSection ? (
        <AncestrySpace2D center={centre} seedNodes={mapSeedNodes} />
      ) : (
        <div className="wo-shell">
          <div className="wo-intro">
            <span className="wo-intro-line" />
            <div>
              <strong>Follow the spine</strong>
              <span>
                The connected main story is the path. Side stories and spinoffs sit below as optional branches.
              </span>
            </div>
          </div>

          {hasStoryPath ? (
            <div className="wo-main">
              <div className="wo-section-label">
                <span>01</span>
                <div>
                  <strong>Main story</strong>
                  <small>
                    {mainPathUncertain
                      ? "Provider links are incomplete, so this path is approximate."
                      : "Follow left → right."}
                  </small>
                </div>
              </div>
              <div className="wo-scroll" aria-label="Main story watch order">
                {mainPath.map((node, index) => (
                  <WatchCard
                    key={(node.id || "node") + "-" + index}
                    node={node}
                    index={index}
                    centerId={centerId}
                  />
                ))}
              </div>
            </div>
          ) : (
            <div className="wo-empty">
              <span>01</span>
              <div>
                <strong>No clear main-story chain</strong>
                <p>
                  {plan?.paths.find((p) => p.id === "main_story")?.note ||
                    "The available provider relations do not establish a main-line sequence."}
                </p>
              </div>
            </div>
          )}

          {sideNodes.length ? (
            <div className="wo-side">
              <div className="wo-section-label">
                <span>02</span>
                <div>
                  <strong>Side stories & spinoffs</strong>
                  <small>Optional franchise entries. They are not inserted into the main path.</small>
                </div>
              </div>
              <div className="wo-side-grid">
                {sideNodes.map((node, index) => (
                  <WatchCard
                    key={(node.id || "side") + "-" + index}
                    node={node}
                    index={index}
                    centerId={centerId}
                    accent
                  />
                ))}
              </div>
            </div>
          ) : null}

          {!loading && !hasStoryPath && !sideNodes.length ? (
            <p className="tools-hint">
              This title does not have enough official relation data to build a watch path.
            </p>
          ) : null}
        </div>
      )}

      {showFlat ? (
        <div className="ab-flat">
          <div className="ab-block">
            <h3 className="ab-block-title">Official franchise entries</h3>
            <div className="ab-grid">
              {allOfficial.map((n) => (
                <PosterCard
                  key={"official-" + n.id}
                  href={n.id === centerId ? undefined : "/anime/" + n.id}
                  title={n.title}
                  image={n.image}
                  current={n.id === centerId}
                  badge={n.id === centerId ? undefined : labelType(n.relationFromCenter || "RELATED")}
                  badgeType={n.relationFromCenter}
                  meta={[n.format, n.year ? String(n.year) : null].filter(Boolean).join(" · ")}
                />
              ))}
            </div>
          </div>
        </div>
      ) : null}

      {!loading && !showMapSection ? (
        <p className="tools-hint" style={{ marginTop: 8 }}>
          Try a title with an established franchise for a fuller watch path.
        </p>
      ) : null}
    </section>
  );
}
