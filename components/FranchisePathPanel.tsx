"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { AnimeRelation, GraphEdge, GraphNode } from "@/lib/types";
import { mergeRelations } from "@/lib/relation-merge";
import {
  resolveFranchise,
  franchiseSummaryLine,
  type FranchisePath,
  type FranchisePlan,
  type FranchiseNode,
} from "@/lib/franchise-resolver";

type Props = {
  centerId: number;
  centerTitle: string;
  centerYear?: number | string;
  centerFormat?: string;
  centerImage?: string;
  relations: AnimeRelation[];
};

type RemotePlan = FranchisePlan & {
  graph?: {
    nodes?: GraphNode[];
    edges?: GraphEdge[];
  };
};

type BranchKind =
  | "main"
  | "film"
  | "satellite"
  | "distant"
  | "parallel"
  | "recap"
  | "uncertain";

type LayoutNode = FranchiseNode & {
  key: string;
  kind: BranchKind;
  x: number;
  y: number;
  relation?: string;
  image?: string;
};

function normaliseRelation(value?: string) {
  return String(value || "OTHER").trim().toUpperCase().replace(/[- ]/g, "_");
}

function branchKind(node: FranchiseNode & { image?: string }): BranchKind {
  const relation = normaliseRelation(node.relationFromCenter);
  const format = normaliseRelation(node.format);

  if ([ "SEQUEL", "PREQUEL", "PARENT", "FULL_STORY" ].includes(relation)) return "main";
  if (relation === "ALTERNATIVE") return "parallel";
  if ([ "SUMMARY", "COMPILATION" ].includes(relation)) return "recap";
  if (format === "MOVIE") return "film";
  if ([ "OVA", "SPECIAL", "ONA" ].includes(format)) return "satellite";
  if ([ "SIDE_STORY", "SPIN_OFF", "CHARACTER" ].includes(relation)) return "distant";
  return "uncertain";
}

function nodeKey(node: FranchiseNode) {
  return node.id != null ? String(node.id) : node.externalId || node.title;
}

function relationLabel(node: FranchiseNode) {
  const relation = normaliseRelation(node.relationFromCenter);
  const labels: Record<string, string> = {
    SEQUEL: "SEQUEL",
    PREQUEL: "PREQUEL",
    PARENT: "PARENT",
    FULL_STORY: "MAIN STORY",
    SIDE_STORY: "SIDE STORY",
    SPIN_OFF: "SPIN-OFF",
    ALTERNATIVE: "ALTERNATIVE",
    SUMMARY: "RECAP",
    CHARACTER: "CHARACTER",
  };
  return labels[relation] || (node.format ? String(node.format).replace(/_/g, " ") : "UNCERTAIN");
}

function layoutNodes(plan: RemotePlan | FranchisePlan, centerId: number): LayoutNode[] {
  const graphNodes = plan.graph?.nodes;
  const source = graphNodes?.length
    ? graphNodes.map((n) => ({
        id: n.id,
        title: n.title,
        year: n.year == null ? undefined : Number(n.year),
        format: n.format,
        relationFromCenter: n.relationType,
        image: n.image,
      }))
    : plan.paths.find((p) => p.id === "completion")?.nodes || [];

  const related = source.filter((n) => n.id !== centerId);
  const grouped: Record<BranchKind, typeof related> = {
    main: [],
    film: [],
    satellite: [],
    distant: [],
    parallel: [],
    recap: [],
    uncertain: [],
  };

  related.forEach((node) => grouped[branchKind(node)].push(node));

  const out: LayoutNode[] = [{
    id: centerId,
    title: plan.center.title,
    year: plan.center.year,
    format: plan.center.format,
    relationFromCenter: "CENTER",
    key: String(centerId),
    kind: "main",
    x: 50,
    y: 50,
    relation: "YOU ARE HERE",
  }];

  const place = (
    nodes: typeof related,
    kind: BranchKind,
    origin: number,
    spread: number,
    yBias = 0,
  ) => {
    nodes.forEach((node, index) => {
      const count = Math.max(1, nodes.length);
      const t = count === 1 ? 0 : index / (count - 1) - 0.5;
      const angle = origin + t * spread;
      const radius = kind === "main" ? 27 : kind === "film" ? 34 : kind === "satellite" ? 39 : 44;
      const rad = (angle * Math.PI) / 180;
      out.push({
        ...node,
        key: nodeKey(node),
        kind,
        x: Math.max(7, Math.min(93, 50 + Math.cos(rad) * radius)),
        y: Math.max(9, Math.min(91, 50 + Math.sin(rad) * radius + yBias)),
        relation: relationLabel(node),
      });
    });
  };

  place(grouped.main, "main", 0, Math.min(78, Math.max(28, grouped.main.length * 18)), 0);
  place(grouped.film, "film", -70, Math.min(58, Math.max(28, grouped.film.length * 18)), 0);
  place(grouped.satellite, "satellite", 70, Math.min(68, Math.max(30, grouped.satellite.length * 16)), 0);
  place(grouped.distant, "distant", 145, Math.min(72, Math.max(30, grouped.distant.length * 16)), 0);
  place(grouped.parallel, "parallel", 90, Math.min(46, Math.max(24, grouped.parallel.length * 15)), -18);
  place(grouped.recap, "recap", 90, Math.min(42, Math.max(22, grouped.recap.length * 14)), 22);
  place(grouped.uncertain, "uncertain", -90, Math.min(62, Math.max(26, grouped.uncertain.length * 15)), 0);

  return out;
}

function edgeKind(edge: GraphEdge, nodeMap: Map<number, LayoutNode>): BranchKind {
  if (edge.family === "mainline") return "main";
  if (edge.family === "alternative") return "parallel";
  if (edge.family === "summary") return "recap";
  if (edge.family === "side_story") {
    const target = nodeMap.get(edge.to) || nodeMap.get(edge.from);
    if (target?.format === "MOVIE") return "film";
    return "distant";
  }
  const label = normaliseRelation(edge.label);
  if ([ "SEQUEL", "PREQUEL", "PARENT", "FULL_STORY" ].includes(label)) return "main";
  if (label === "ALTERNATIVE") return "parallel";
  if ([ "SUMMARY", "COMPILATION" ].includes(label)) return "recap";
  return "uncertain";
}

export function FranchisePathPanel({
  centerId,
  centerTitle,
  centerYear,
  centerFormat,
  centerImage,
  relations,
}: Props) {
  const router = useRouter();
  const [pathId, setPathId] = useState<FranchisePath["id"]>("main_story");
  const [remotePlan, setRemotePlan] = useState<RemotePlan | null>(null);
  const [remoteLoading, setRemoteLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    setRemoteLoading(true);
    fetch(`/api/watch-order?id=${centerId}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data: RemotePlan | null) => {
        if (!cancelled && data?.paths) setRemotePlan(data);
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setRemoteLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [centerId]);

  const fallbackPlan = useMemo(() => {
    if (!relations.length) return null;
    const merged = mergeRelations(
      relations.map((r) => ({
        id: r.id,
        title: r.title,
        relationType: r.relationType,
        format: r.format,
      })),
      [],
    );
    const enrich: Record<number, { title?: string; year?: number; format?: string }> = {};
    for (const r of relations) {
      enrich[r.id] = {
        title: r.title,
        year: r.year != null ? Number(r.year) : undefined,
        format: r.format,
      };
    }
    return resolveFranchise({
      center: {
        id: centerId,
        title: centerTitle,
        year: centerYear != null ? Number(centerYear) : undefined,
        format: centerFormat,
      },
      relations: merged,
      enrich,
    });
  }, [centerId, centerTitle, centerYear, centerFormat, relations]);

  const plan = remotePlan || fallbackPlan;
  const graphEdges = remotePlan?.graph?.edges || [];

  const constellation = useMemo(
    () => (plan ? layoutNodes(plan, centerId) : []).map((node) =>
      node.id === centerId && centerImage ? { ...node, image: centerImage } : node,
    ),
    [plan, centerId],
  );

  const selected = constellation.find((node) => node.id === selectedId) || null;
  const nodeMap = useMemo(
    () => new Map(constellation.filter((node) => node.id != null).map((node) => [node.id!, node])),
    [constellation],
  );

  if (!plan || plan.relationCount < 1) return null;

  const active = plan.paths.find((p) => p.id === pathId) || plan.paths.find((p) => p.id === "main_story") || plan.paths[0];
  if (!active || active.nodes.length < 2) return null;

  const visibleKeys = new Set(active.nodes.map(nodeKey));
  const edges = graphEdges.length
    ? graphEdges.filter((edge) => nodeMap.has(edge.from) && nodeMap.has(edge.to))
    : active.nodes.slice(1).map((node, index) => ({
        from: active.nodes[index].id || centerId,
        to: node.id || centerId,
        kind: "official" as const,
        label: node.relationFromCenter,
      }));

  const focusClass = selected ? " has-focus" : "";

  const selectNode = (node: LayoutNode) => {
    if (node.id == null || node.id === centerId) return;
    setSelectedId(node.id);
    window.setTimeout(() => router.push(`/anime/${node.id}`), 360);
  };

  return (
    <section className={"franchise-path" + focusClass} aria-label="Franchise constellation">
      <div className="franchise-path__header">
        <div>
          <span className="franchise-path__eyebrow">FRANCHISE CONSTELLATION</span>
          <h2>One world. Every route.</h2>
          <p>{remoteLoading ? "Tracing the franchise graph…" : franchiseSummaryLine(plan)}</p>
        </div>
        <span className="franchise-path__status">
          <i /> {remoteLoading ? "SYNCING" : `${constellation.length} WORKS MAPPED`}
        </span>
      </div>

      <div className="franchise-path__legend" aria-label="Constellation legend">
        <span className="is-main">MAIN STORY</span>
        <span className="is-film">FILMS</span>
        <span className="is-satellite">OVAs / SPECIALS</span>
        <span className="is-distant">SPIN-OFFS</span>
        <span className="is-parallel">ALTERNATIVES</span>
        <span className="is-recap">RECAPS</span>
        <span className="is-uncertain">UNCERTAIN</span>
      </div>

      <div className="franchise-path__tabs" role="tablist" aria-label="Franchise views">
        {plan.paths.map((p) => (
          <button
            key={p.id}
            type="button"
            role="tab"
            aria-selected={active.id === p.id}
            className={active.id === p.id ? "is-active" : ""}
            onClick={() => {
              setPathId(p.id);
              setSelectedId(null);
            }}
          >
            {p.label}
          </button>
        ))}
      </div>

      {active.note ? (
        <p className={"franchise-path__note" + (active.uncertain ? " is-uncertain" : "")}>
          {active.uncertain ? "UNCERTAIN · " : ""}{active.note}
        </p>
      ) : null}

      <div className="franchise-path__viewport" role="application" aria-label="Interactive franchise map">
        <div className="franchise-path__grid" aria-hidden />
        <div className="franchise-path__halo franchise-path__halo--outer" aria-hidden />
        <div className="franchise-path__halo franchise-path__halo--inner" aria-hidden />

        <svg className="franchise-path__edges" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden>
          {edges.map((edge, index) => {
            const from = nodeMap.get(edge.from);
            const to = nodeMap.get(edge.to);
            if (!from || !to) return null;
            const kind = edgeKind(edge, nodeMap);
            const dim = !visibleKeys.has(from.key) || !visibleKeys.has(to.key);
            const activeEdge = selectedId != null && (edge.from === selectedId || edge.to === selectedId);
            return (
              <line
                key={`${edge.from}-${edge.to}-${index}`}
                x1={from.x}
                y1={from.y}
                x2={to.x}
                y2={to.y}
                className={`is-${kind}${dim ? " is-dim" : ""}${activeEdge ? " is-selected" : ""}`}
              />
            );
          })}
        </svg>

        {constellation.map((node) => {
          const isCenter = node.id === centerId;
          const isSelected = selectedId === node.id;
          const dim = !isCenter && !visibleKeys.has(node.key);
          return (
            <button
              key={node.key}
              type="button"
              className={[
                "franchise-path__node",
                `is-${node.kind}`,
                isCenter ? "is-center" : "",
                isSelected ? "is-selected" : "",
                dim ? "is-dim" : "",
              ].filter(Boolean).join(" ")}
              style={{ "--node-x": `${node.x}%`, "--node-y": `${node.y}%` } as React.CSSProperties}
              onClick={() => selectNode(node)}
              aria-label={isCenter ? `${node.title}. You are here.` : `Open ${node.title}`}
            >
              <span className="franchise-path__node-orbit" aria-hidden />
              <span className="franchise-path__node-art">
                {node.image ? (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img src={node.image} alt="" loading="lazy" />
                ) : <span className="franchise-path__node-placeholder" />}
              </span>
              <span className="franchise-path__node-copy">
                <small>{isCenter ? "YOU ARE HERE" : node.relation}</small>
                <strong>{node.title}</strong>
                <i>{node.year || "—"}{node.format ? ` · ${node.format}` : ""}</i>
              </span>
            </button>
          );
        })}

        <div className="franchise-path__core-label" aria-hidden>
          <span>FRANCHISE FIELD</span>
          <strong>{centerTitle}</strong>
        </div>
      </div>

      {selected ? (
        <div className="franchise-path__selection" aria-live="polite">
          <span>TRAVELLING TO</span>
          <strong>{selected.title}</strong>
          <small>Following the franchise thread…</small>
        </div>
      ) : (
        <div className="franchise-path__hint">
          Select any work. The field pulls focus to it, then carries you into its world.
        </div>
      )}
    </section>
  );
}
