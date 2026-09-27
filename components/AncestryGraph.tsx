"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { AnimeRelation } from "@/lib/types";
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
  year?: number;
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
  paths: WatchPath[];
  relationCount: number;
};

const WATCH_TYPES = new Set([
  "PREQUEL",
  "PARENT",
  "SEQUEL",
  "FULL_STORY",
  "SIDE_STORY",
  "SPIN_OFF",
]);

const SIDE_TYPES = new Set(["SIDE_STORY", "SPIN_OFF"]);

function watchType(value?: string) {
  return (value || "").toUpperCase();
}

function isWatchRelation(value?: string) {
  return WATCH_TYPES.has(watchType(value));
}

function relationLabel(value?: string) {
  return watchType(value).replace(/_/g, " ").toLowerCase().replace(/^\w/, (c) => c.toUpperCase());
}

function formatMeta(node: WatchNode) {
  return [node.format, node.year ? String(node.year) : null].filter(Boolean).join(" · ");
}

function WatchCard({
  node,
  index,
  current,
  relation,
}: {
  node: WatchNode;
  index: number;
  current?: boolean;
  relation?: string;
}) {
  const href = node.id != null ? `/anime/${node.id}` : undefined;
  const content = (
    <div className={"wo-card" + (current ? " wo-card-current" : "")}>
      <div className="wo-poster">
        <span className="wo-index">{String(index + 1).padStart(2, "0")}</span>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={node.id != null ? undefined : "https://placehold.co/300x450/15100f/665?text=?"}
          alt=""
          loading="lazy"
        />
        {node.id != null ? (
          <WatchPosterImage id={node.id} title={node.title} />
        ) : null}
        {current ? <span className="wo-here">YOU ARE HERE</span> : null}
      </div>
      {relation && !current ? (
        <span className="wo-relation">{relationLabel(relation)}</span>
      ) : null}
      <div className="wo-title">{node.title}</div>
      <div className="wo-meta">{formatMeta(node) || (current ? "Current title" : "")}</div>
    </div>
  );

  if (!href || current) return content;

  return (
    <Link
      href={href}
      className="wo-poster-link"
      data-motion-origin="node"
      onClick={(event) => {
        if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0) return;
        event.preventDefault();
        const rect = event.currentTarget.getBoundingClientRect();
        const spatialX = ((rect.left + rect.width / 2) / Math.max(window.innerWidth, 1)) * 2 - 1;
        playInteractionSound("franchise", { gain: 0.72 });
        playSpatialTravel(spatialX, 0.28);
        withViewTransition(
          () => useRouter().push(href),
          {
            route: "franchise",
            origin: "node",
            destination: "graph",
            objectId: getAnimeObjectId(String(node.id)),
          },
        );
      }}
    >
      {content}
    </Link>
  );
}

function WatchPosterImage({ id, title }: { id: number; title: string }) {
  const [src, setSrc] = useState<string | undefined>();

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/anime?id=${id}`)
      .then((r) => r.ok ? r.json() : null)
      .then((data) => {
        if (!cancelled) setSrc(data?.image || data?.data?.image);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [id]);

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src || "https://placehold.co/300x450/15100f/665?text=…"}
      alt=""
      loading="lazy"
      onError={(event) => {
        event.currentTarget.style.opacity = "0";
      }}
      title={title}
    />
  );
}

function PathRow({
  nodes,
  centerId,
}: {
  nodes: WatchNode[];
  centerId: number;
}) {
  return (
    <div className="wo-scroll" aria-label="Watch path">
      {nodes.map((node, index) => (
        <div className="wo-card-wrap" key={`${node.id || node.title}-${index}`}>
          {index > 0 ? (
            <div className="wo-arrow" aria-hidden="true">
              <span />
              <b>›</b>
            </div>
          ) : null}
          <WatchCard
            node={node}
            index={index}
            current={node.id === centerId}
            relation={node.relationFromCenter}
          />
        </div>
      ))}
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
  const [plan, setPlan] = useState<WatchPlan | null>(null);
  const [loading, setLoading] = useState(true);
  const [pathId, setPathId] = useState<WatchPath["id"]>("main_story");

  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    fetch(`/api/watch-order?id=${centerId}`, { cache: "no-store" })
      .then((response) => response.ok ? response.json() : null)
      .then((data) => {
        if (cancelled) return;
        if (data?.paths && Array.isArray(data.paths)) {
          setPlan({
            paths: data.paths,
            relationCount: Number(data.relationCount || 0),
          });
          return;
        }

        const fallback = (initial || [])
          .filter((r) => isWatchRelation(r.relationType))
          .map((r) => ({
            id: r.id,
            title: r.title,
            year: r.year == null ? undefined : Number(r.year),
            format: r.format,
            relationFromCenter: watchType(r.relationType),
          }));

        setPlan({
          relationCount: fallback.length,
          paths: [
            {
              id: "main_story",
              label: "Main story",
              nodes: [
                {
                  id: centerId,
                  title: centerTitle,
                  year: centerYear == null ? undefined : Number(centerYear),
                  format: "Current title",
                },
                ...fallback.filter((n) => !SIDE_TYPES.has(watchType(n.relationFromCenter))),
              ],
              uncertain: fallback.length === 0,
              note: fallback.length === 0 ? "No main-line relations were found." : "Side stories and spinoffs are excluded.",
            },
            {
              id: "release",
              label: "Release order",
              nodes: [
                {
                  id: centerId,
                  title: centerTitle,
                  year: centerYear == null ? undefined : Number(centerYear),
                  format: "Current title",
                },
                ...fallback,
              ].sort((a, b) => (a.year ?? 9999) - (b.year ?? 9999)),
              uncertain: true,
              note: "Fallback order based on available release years.",
            },
            {
              id: "chronological",
              label: "Story order",
              nodes: [],
              uncertain: true,
            },
            {
              id: "completion",
              label: "Full franchise",
              nodes: [
                {
                  id: centerId,
                  title: centerTitle,
                  year: centerYear == null ? undefined : Number(centerYear),
                  format: "Current title",
                },
                ...fallback,
              ],
              uncertain: true,
            },
          ],
        });
      })
      .catch(() => {
        if (!cancelled) setPlan(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [centerId, centerTitle, centerYear, initial]);

  const paths = useMemo(() => {
    if (!plan) return [];
    return plan.paths.filter((path) => path.nodes.length > 0);
  }, [plan]);

  const activePath = paths.find((path) => path.id === pathId) || paths.find((path) => path.id === "main_story") || paths[0];

  const sideStories = useMemo(() => {
    const completion = plan?.paths.find((path) => path.id === "completion");
    if (!completion) return [];
    return completion.nodes.filter(
      (node) =>
        node.id !== centerId &&
        SIDE_TYPES.has(watchType(node.relationFromCenter)),
    );
  }, [plan, centerId]);

  return (
    <section className="detail-section ancestry-section" id="watch-order">
      <div className="ab-header">
        <div>
          <p className="ab-kicker">Franchise</p>
          <h2>Watch order</h2>
          <p className="ancestry-lead">
            {loading
              ? "Building the official story path…"
              : plan
                ? `${plan.relationCount} story links · recommendations excluded`
                : "Watch-order data could not be loaded."}
          </p>
        </div>
      </div>

      {loading ? (
        <div className="wo-shell wo-empty">
          <span>01</span>
          <div>
            <strong>Tracing the franchise spine</strong>
            <p>Separating the main story from side stories and spinoffs.</p>
          </div>
        </div>
      ) : activePath ? (
        <div className="wo-shell">
          <div className="wo-intro">
            <span className="wo-intro-line" />
            <div>
              <strong>{activePath.label}</strong>
              <span>{activePath.note || "Follow the connected story works in order."}</span>
            </div>
          </div>

          <div className="wo-actions" style={{ padding: "12px 14px 0" }}>
            {paths.map((path) => (
              <button
                key={path.id}
                type="button"
                className={"btn btn-outline btn-sm" + (path.id === activePath.id ? " is-active" : "")}
                onClick={() => setPathId(path.id)}
              >
                {path.label}
              </button>
            ))}
          </div>

          <div className="wo-main">
            <div className="wo-section-label">
              <span>WATCH</span>
              <div>
                <strong>{activePath.id === "main_story" ? "Main story" : activePath.label}</strong>
                <small>
                  {activePath.uncertain ? "Some ordering is uncertain." : "Explicit provider relations define this path."}
                </small>
              </div>
            </div>
            <PathRow nodes={activePath.nodes} centerId={centerId} />
          </div>

          {sideStories.length > 0 ? (
            <div className="wo-side">
              <div className="wo-section-label">
                <span>OPTIONAL</span>
                <div>
                  <strong>Side stories &amp; spinoffs</strong>
                  <small>Not part of the main story path.</small>
                </div>
              </div>
              <div className="wo-side-grid">
                {sideStories.map((node, index) => (
                  <div className="wo-card-wrap" key={`${node.id || node.title}-side-${index}`}>
                    <WatchCard
                      node={node}
                      index={index}
                      relation={node.relationFromCenter}
                    />
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      ) : (
        <div className="wo-shell wo-empty">
          <span>!</span>
          <div>
            <strong>No official watch-order links found.</strong>
            <p>This title does not currently have enough explicit franchise relations to build a path.</p>
          </div>
        </div>
      )}
    </section>
  );
}
