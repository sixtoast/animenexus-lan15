"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { GraphEdge, GraphNode } from "@/lib/types";

type CenterSpec = {
  id: number;
  title: string;
  image?: string;
  year?: number | string | null;
};

type Props = {
  center: CenterSpec;
  /** Seed nodes from SSR (1-hop). Deep graph loads client-side. */
  seedNodes?: GraphNode[];
};

type SimNode = GraphNode & {
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number;
  isCenter?: boolean;
};

function edgeStroke(kind: GraphEdge["kind"]) {
  return kind === "official"
    ? "rgba(143,212,160,0.55)"
    : "rgba(240,160,144,0.4)";
}

function shortLabel(t: string) {
  return (t || "link").replace(/_/g, " ").slice(0, 12);
}

export function AncestrySpace2D({ center, seedNodes = [] }: Props) {
  const router = useRouter();
  const wrapRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ w: 360, h: 440 });
  const [scale, setScale] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [nodes, setNodes] = useState<SimNode[]>([]);
  const [edges, setEdges] = useState<GraphEdge[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<SimNode | null>(null);

  const nodesRef = useRef<SimNode[]>([]);
  const edgesRef = useRef<GraphEdge[]>([]);
  const pinned = useRef<number | null>(null);
  const drag = useRef<{
    mode: "pan" | "node";
    id?: number;
    x: number;
    y: number;
    px: number;
    py: number;
    moved: boolean;
  } | null>(null);
  const pinch = useRef<{ dist: number; scale: number } | null>(null);
  const panRef = useRef(pan);
  const scaleRef = useRef(scale);
  panRef.current = pan;
  scaleRef.current = scale;

  // Resize
  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      const cr = entries[0]?.contentRect;
      if (!cr) return;
      setSize({
        w: Math.max(280, cr.width),
        h: Math.max(360, Math.min(540, cr.width * 1.2)),
      });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Load multi-hop graph
  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    const bootstrap = (list: GraphNode[], edgeList: GraphEdge[]) => {
      const w = size.w;
      const h = size.h;
      const cx = w / 2;
      const cy = h / 2;
      const sim: SimNode[] = [
        {
          id: center.id,
          title: center.title,
          image: center.image,
          relationType: "CENTER",
          year: center.year as number | null,
          x: cx,
          y: cy,
          vx: 0,
          vy: 0,
          r: 36,
          isCenter: true,
          layer: undefined,
        },
      ];
      list.forEach((n, i) => {
        const angle = (i / Math.max(list.length, 1)) * Math.PI * 2 - Math.PI / 2;
        const rad = 90 + (n.depth || 0) * 50 + (i % 3) * 12;
        sim.push({
          ...n,
          x: cx + Math.cos(angle) * rad,
          y: cy + Math.sin(angle) * rad,
          vx: 0,
          vy: 0,
          r: n.layer === "recommended" || n.relationType === "RECOMMENDED" ? 26 : 30,
        });
      });
      nodesRef.current = sim;
      edgesRef.current = edgeList;
      setNodes([...sim]);
      setEdges(edgeList);
    };

    // Instant seed from SSR
    if (seedNodes.length) {
      const seedEdges: GraphEdge[] = seedNodes.map((n) => ({
        from: center.id,
        to: n.id,
        kind:
          n.relationType === "RECOMMENDED" || n.layer === "recommended"
            ? "recommended"
            : "official",
        label: n.relationType,
      }));
      bootstrap(seedNodes, seedEdges);
    }

    fetch(`/api/relations?id=${center.id}&deep=1`)
      .then((r) => r.json())
      .then((j) => {
        if (cancelled) return;
        if (Array.isArray(j.nodes) && Array.isArray(j.edges)) {
          bootstrap(j.nodes as GraphNode[], j.edges as GraphEdge[]);
        } else if (Array.isArray(j.data)) {
          const list = j.data as GraphNode[];
          bootstrap(
            list,
            list.map((n) => ({
              from: center.id,
              to: n.id,
              kind:
                n.relationType === "RECOMMENDED"
                  ? ("recommended" as const)
                  : ("official" as const),
              label: n.relationType,
            })),
          );
        }
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [center.id, center.title, center.image]);

  // Physics loop
  useEffect(() => {
    let raf = 0;
    let running = true;

    const tick = () => {
      if (!running) return;
      const sim = nodesRef.current;
      const eds = edgesRef.current;
      if (sim.length < 2) {
        raf = requestAnimationFrame(tick);
        return;
      }

      const w = size.w;
      const h = size.h;
      const cx = w / 2;
      const cy = h / 2;

      // Repulsion
      for (let i = 0; i < sim.length; i++) {
        for (let j = i + 1; j < sim.length; j++) {
          const a = sim[i];
          const b = sim[j];
          let dx = b.x - a.x;
          let dy = b.y - a.y;
          let dist = Math.hypot(dx, dy) || 0.01;
          const minD = a.r + b.r + 16;
          if (dist < minD) dist = minD;
          const force = 900 / (dist * dist);
          const fx = (dx / dist) * force;
          const fy = (dy / dist) * force;
          if (!a.isCenter && pinned.current !== a.id) {
            a.vx -= fx;
            a.vy -= fy;
          }
          if (!b.isCenter && pinned.current !== b.id) {
            b.vx += fx;
            b.vy += fy;
          }
        }
      }

      // Springs along edges
      for (const e of eds) {
        const a = sim.find((n) => n.id === e.from);
        const b = sim.find((n) => n.id === e.to);
        if (!a || !b) continue;
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const dist = Math.hypot(dx, dy) || 0.01;
        const rest = e.kind === "official" ? 110 : 145;
        const k = e.kind === "official" ? 0.045 : 0.028;
        const f = (dist - rest) * k;
        const fx = (dx / dist) * f;
        const fy = (dy / dist) * f;
        if (!a.isCenter && pinned.current !== a.id) {
          a.vx += fx;
          a.vy += fy;
        }
        if (!b.isCenter && pinned.current !== b.id) {
          b.vx -= fx;
          b.vy -= fy;
        }
      }

      // Gravity toward center + soft bounds
      for (const n of sim) {
        if (n.isCenter) {
          n.x = cx;
          n.y = cy;
          n.vx = 0;
          n.vy = 0;
          continue;
        }
        if (pinned.current === n.id) continue;
        n.vx += (cx - n.x) * 0.0025;
        n.vy += (cy - n.y) * 0.0025;
        n.vx *= 0.82;
        n.vy *= 0.82;
        n.x += n.vx;
        n.y += n.vy;
        const pad = n.r + 8;
        n.x = Math.max(pad, Math.min(w - pad, n.x));
        n.y = Math.max(pad, Math.min(h - pad, n.y));
      }

      setNodes([...sim]);
      raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);
    return () => {
      running = false;
      cancelAnimationFrame(raf);
    };
  }, [size.w, size.h]);

  const screenToWorld = (clientX: number, clientY: number) => {
    const el = wrapRef.current;
    if (!el) return { x: 0, y: 0 };
    const rect = el.getBoundingClientRect();
    const sx = clientX - rect.left;
    const sy = clientY - rect.top;
    const { x: px, y: py } = panRef.current;
    const s = scaleRef.current;
    return {
      x: (sx - px - size.w / 2) / s + size.w / 2,
      y: (sy - py - size.h / 2) / s + size.h / 2,
    };
  };

  const hitNode = (wx: number, wy: number) => {
    let best: SimNode | null = null;
    let bestD = Infinity;
    for (const n of nodesRef.current) {
      const d = Math.hypot(wx - n.x, wy - n.y);
      if (d < n.r + 12 && d < bestD) {
        bestD = d;
        best = n;
      }
    }
    return best;
  };

  const onPointerDown = (e: React.PointerEvent) => {
    try {
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    } catch {
      /* */
    }
    const world = screenToWorld(e.clientX, e.clientY);
    const hit = hitNode(world.x, world.y);
    if (hit && !hit.isCenter) {
      pinned.current = hit.id;
      drag.current = {
        mode: "node",
        id: hit.id,
        x: e.clientX,
        y: e.clientY,
        px: hit.x,
        py: hit.y,
        moved: false,
      };
    } else {
      drag.current = {
        mode: "pan",
        x: e.clientX,
        y: e.clientY,
        px: pan.x,
        py: pan.y,
        moved: false,
      };
    }
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!drag.current) return;
    const dx = e.clientX - drag.current.x;
    const dy = e.clientY - drag.current.y;
    if (Math.hypot(dx, dy) > 8) drag.current.moved = true;

    if (drag.current.mode === "pan") {
      setPan({ x: drag.current.px + dx, y: drag.current.py + dy });
      return;
    }
    const id = drag.current.id;
    const n = nodesRef.current.find((x) => x.id === id);
    if (!n) return;
    const world = screenToWorld(e.clientX, e.clientY);
    n.x = world.x;
    n.y = world.y;
    n.vx = 0;
    n.vy = 0;
  };

  const onPointerUp = (e: React.PointerEvent) => {
    const d = drag.current;
    const wasPinned = pinned.current;
    pinned.current = null;
    drag.current = null;
    if (!d || d.moved) return;
    const world = screenToWorld(e.clientX, e.clientY);
    const hit = hitNode(world.x, world.y);
    if (!hit) {
      setSelected(null);
      return;
    }
    setSelected(hit);
    if (!hit.isCenter) {
      window.setTimeout(() => router.push(`/anime/${hit.id}`), 90);
    }
    void wasPinned;
  };

  // Pinch zoom
  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const dist = (t: TouchList) =>
      Math.hypot(t[0].clientX - t[1].clientX, t[0].clientY - t[1].clientY);
    const onStart = (e: TouchEvent) => {
      if (e.touches.length === 2) {
        pinch.current = { dist: dist(e.touches), scale: scaleRef.current };
        drag.current = null;
        pinned.current = null;
      }
    };
    const onMove = (e: TouchEvent) => {
      if (e.touches.length === 2 && pinch.current) {
        e.preventDefault();
        const ratio = dist(e.touches) / pinch.current.dist;
        setScale(Math.max(0.55, Math.min(2.4, pinch.current.scale * ratio)));
      }
    };
    const onEnd = () => {
      pinch.current = null;
    };
    el.addEventListener("touchstart", onStart, { passive: true });
    el.addEventListener("touchmove", onMove, { passive: false });
    el.addEventListener("touchend", onEnd);
    return () => {
      el.removeEventListener("touchstart", onStart);
      el.removeEventListener("touchmove", onMove);
      el.removeEventListener("touchend", onEnd);
    };
  }, []);

  const zoomBy = (d: number) =>
    setScale((s) => Math.max(0.55, Math.min(2.4, s + d)));
  const resetView = () => {
    setScale(1);
    setPan({ x: 0, y: 0 });
    setSelected(null);
  };

  const cx = size.w / 2;
  const cy = size.h / 2;
  const byId = new Map(nodes.map((n) => [n.id, n]));

  return (
    <div className="ab2-shell">
      <div className="ab2-toolbar" role="toolbar" aria-label="Map controls">
        <button type="button" className="ab2-tool" onClick={() => zoomBy(0.15)} aria-label="Zoom in">
          +
        </button>
        <button type="button" className="ab2-tool" onClick={() => zoomBy(-0.15)} aria-label="Zoom out">
          −
        </button>
        <button type="button" className="ab2-tool ab2-tool-wide" onClick={resetView}>
          Reset
        </button>
      </div>

      {loading ? <div className="ab2-loading">Expanding recommendations…</div> : null}

      <div
        ref={wrapRef}
        className="ab2-stage"
        style={{ height: size.h }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={() => {
          drag.current = null;
          pinned.current = null;
        }}
        role="application"
        aria-label="Ancestry physics map"
      >
        <svg className="ab2-svg" width={size.w} height={size.h} viewBox={`0 0 ${size.w} ${size.h}`}>
          <defs>
            <radialGradient id="ab2-glow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="rgba(240,160,144,0.2)" />
              <stop offset="100%" stopColor="rgba(240,160,144,0)" />
            </radialGradient>
          </defs>
          <g
            style={{
              transform: `translate(${pan.x}px, ${pan.y}px) scale(${scale})`,
              transformOrigin: `${cx}px ${cy}px`,
            }}
          >
            <circle cx={cx} cy={cy} r={Math.min(size.w, size.h) * 0.32} fill="url(#ab2-glow)" />
            {edges.map((e, i) => {
              const a = byId.get(e.from);
              const b = byId.get(e.to);
              if (!a || !b) return null;
              return (
                <line
                  key={`e-${i}-${e.from}-${e.to}`}
                  x1={a.x}
                  y1={a.y}
                  x2={b.x}
                  y2={b.y}
                  stroke={edgeStroke(e.kind)}
                  strokeWidth={e.kind === "official" ? 2 : 1.25}
                  strokeLinecap="round"
                />
              );
            })}
          </g>
        </svg>

        <div
          className="ab2-nodes"
          style={{
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${scale})`,
            transformOrigin: `${cx}px ${cy}px`,
            width: size.w,
            height: size.h,
          }}
        >
          {nodes.map((n) => {
            const isSel = selected?.id === n.id;
            const isRec =
              n.layer === "recommended" || n.relationType === "RECOMMENDED";
            return (
              <button
                key={`n-${n.id}`}
                type="button"
                className={
                  "ab2-node" +
                  (n.isCenter ? " ab2-node-center" : "") +
                  (isRec ? " ab2-node-rec" : "") +
                  (isSel ? " ab2-node-sel" : "")
                }
                style={{
                  left: n.x,
                  top: n.y,
                  width: n.r * 2,
                  height: n.r * 2,
                }}
                aria-label={n.isCenter ? n.title : `Open ${n.title}`}
                onClick={(e) => {
                  e.stopPropagation();
                  setSelected(n);
                  if (!n.isCenter) router.push(`/anime/${n.id}`);
                }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={n.image || "https://placehold.co/120x120/1a1a1a/555?text=?"}
                  alt=""
                  draggable={false}
                />
                <span
                  className={
                    "ab2-chip " +
                    (n.isCenter
                      ? "ab2-chip-here"
                      : isRec
                        ? "ab2-chip-recommended"
                        : "ab2-chip-official")
                  }
                >
                  {n.isCenter ? "Here" : shortLabel(n.relationType)}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="ab2-hud" aria-live="polite">
        {selected ? (
          <>
            <strong>{selected.title}</strong>
            <span>
              {[
                selected.isCenter
                  ? "Current title"
                  : selected.relationType.replace(/_/g, " "),
                selected.year ? String(selected.year) : null,
                selected.score != null ? `★ ${selected.score.toFixed(1)}` : null,
              ]
                .filter(Boolean)
                .join(" · ")}
            </span>
          </>
        ) : (
          <span className="ab2-hint">
            {loading
              ? "Pulling recommendation chains…"
              : "Drag background to pan · drag a poster to tug it · pinch to zoom · tap to open"}
          </span>
        )}
      </div>

      <div className="ab2-legend">
        <span className="ab2-leg ab2-leg-off">Official</span>
        <span className="ab2-leg ab2-leg-rec">Recommended chain</span>
      </div>
    </div>
  );
}
