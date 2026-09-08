"use client";

/**
 * Archive Field — every sealed title as a node in a living map.
 * Not a shelf. Orbit / constellation / timeline layouts. No title cap.
 */

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
  type WheelEvent as ReactWheelEvent,
} from "react";
import Link from "next/link";
import type { WatchlistEntry, WatchStatus } from "@/lib/types";
import {
  countByStatus,
  FIELD_STATUS_COLORS,
  FIELD_STATUS_LABELS,
  projectFieldNodes,
  type FieldLayoutMode,
  type FieldNode,
} from "@/lib/archive-field";
import { describeShelfPair } from "@/lib/shelf-resonance";
import { playCue } from "@/lib/sound-engine";
import { AnimeImage } from "@/components/AnimeImage";

const LAYOUT_KEY = "anime_nexus_archive_field_layout_v1";

function readLayout(): FieldLayoutMode {
  if (typeof window === "undefined") return "orbit";
  try {
    const v = localStorage.getItem(LAYOUT_KEY);
    if (v === "orbit" || v === "constellation" || v === "timeline") return v;
  } catch {
    /* */
  }
  return "orbit";
}

function nodeSize(weight: number, zoom: number, total: number): number {
  const density = total > 80 ? 0.72 : total > 40 ? 0.85 : 1;
  const base = (36 + weight * 42) * density;
  return Math.max(22, Math.min(96, base * Math.min(1.35, 0.85 + zoom * 0.15)));
}

export function ArchiveField({ entries }: { entries: WatchlistEntry[] }) {
  const [layout, setLayout] = useState<FieldLayoutMode>("orbit");
  const [statusFilter, setStatusFilter] = useState<WatchStatus | "all">("all");
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [compareId, setCompareId] = useState<number | null>(null);
  const [compareArmed, setCompareArmed] = useState(false);

  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const dragging = useRef(false);
  const lastPtr = useRef({ x: 0, y: 0 });
  const stageRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setLayout(readLayout());
  }, []);

  const nodes = useMemo(
    () => projectFieldNodes(entries, layout),
    [entries, layout],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return nodes.filter((n) => {
      if (statusFilter !== "all" && n.status !== statusFilter) return false;
      if (q && !n.title.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [nodes, statusFilter, query]);

  const byId = useMemo(() => {
    const m = new Map<number, WatchlistEntry>();
    for (const e of entries) m.set(e.id, e);
    return m;
  }, [entries]);

  const selected = selectedId != null ? byId.get(selectedId) : null;
  const selectedNode =
    selectedId != null ? nodes.find((n) => n.id === selectedId) : null;

  const relationship = useMemo(() => {
    if (selectedId == null || compareId == null) return null;
    const a = byId.get(selectedId);
    const b = byId.get(compareId);
    if (!a || !b) return null;
    return describeShelfPair(a, b);
  }, [selectedId, compareId, byId]);

  const counts = useMemo(() => countByStatus(entries), [entries]);

  const setLayoutPersist = useCallback((m: FieldLayoutMode) => {
    setLayout(m);
    try {
      localStorage.setItem(LAYOUT_KEY, m);
    } catch {
      /* */
    }
  }, []);

  const onSelect = useCallback(
    (id: number) => {
      if (compareArmed && selectedId != null && id !== selectedId) {
        setCompareId(id);
        setCompareArmed(false);
        playCue("resonance");
        return;
      }
      setSelectedId(id);
      setCompareId(null);
      playCue("shelf_settle");
    },
    [compareArmed, selectedId],
  );

  const resetCamera = useCallback(() => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  }, []);

  const onWheel = useCallback((e: ReactWheelEvent) => {
    e.preventDefault();
    setZoom((z) => Math.max(0.45, Math.min(2.4, z - e.deltaY * 0.0012)));
  }, []);

  const onPointerDown = useCallback((e: ReactPointerEvent) => {
    if ((e.target as HTMLElement).closest("[data-field-node]")) return;
    dragging.current = true;
    lastPtr.current = { x: e.clientX, y: e.clientY };
    (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
  }, []);

  const onPointerMove = useCallback((e: ReactPointerEvent) => {
    if (!dragging.current) return;
    const dx = e.clientX - lastPtr.current.x;
    const dy = e.clientY - lastPtr.current.y;
    lastPtr.current = { x: e.clientX, y: e.clientY };
    setPan((p) => ({ x: p.x + dx, y: p.y + dy }));
  }, []);

  const onPointerUp = useCallback(() => {
    dragging.current = false;
  }, []);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
      if (e.key === "Escape") {
        setCompareArmed(false);
        setCompareId(null);
        setSelectedId(null);
      }
      if ((e.key === "c" || e.key === "C") && selectedId != null) {
        setCompareArmed(true);
      }
      if (e.key === "Enter" && selectedId != null) {
        window.location.href = `/anime/${selectedId}`;
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selectedId]);

  if (!entries.length) {
    return (
      <div className="state-box lantern-empty archive-field-empty">
        <h3>The field is empty</h3>
        <p>
          Seal titles in <strong>Manage</strong> — every entry becomes a node
          in the Archive Field.
        </p>
      </div>
    );
  }

  return (
    <div className="archive-field" data-layout={layout}>
      <header className="archive-field-toolbar">
        <div className="archive-field-modes" role="group" aria-label="Field layout">
          {(
            [
              ["orbit", "Orbit"],
              ["constellation", "Constellation"],
              ["timeline", "Timeline"],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              className={
                "btn btn-sm " + (layout === id ? "btn-accent" : "btn-outline")
              }
              aria-pressed={layout === id}
              onClick={() => setLayoutPersist(id)}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="archive-field-filters">
          <input
            className="filter-input archive-field-search"
            placeholder="Find a title…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            aria-label="Filter titles in the field"
          />
          <select
            className="filter-input"
            value={statusFilter}
            onChange={(e) =>
              setStatusFilter(e.target.value as WatchStatus | "all")
            }
            aria-label="Filter by status"
          >
            <option value="all">All statuses ({entries.length})</option>
            {(Object.keys(FIELD_STATUS_LABELS) as WatchStatus[]).map((s) => (
              <option key={s} value={s}>
                {FIELD_STATUS_LABELS[s]} ({counts[s]})
              </option>
            ))}
          </select>
        </div>

        <div className="archive-field-cam">
          <button
            type="button"
            className="btn btn-outline btn-sm"
            onClick={resetCamera}
          >
            Reset view
          </button>
          <span className="meta">
            {filtered.length} of {entries.length} · drag to pan · scroll to zoom
          </span>
        </div>
      </header>

      <div className="archive-field-legend" aria-hidden>
        {(Object.keys(FIELD_STATUS_LABELS) as WatchStatus[]).map((s) => (
          <button
            key={s}
            type="button"
            className={
              "archive-field-legend-chip" +
              (statusFilter === s ? " is-active" : "")
            }
            style={{ ["--chip" as string]: FIELD_STATUS_COLORS[s] }}
            onClick={() => setStatusFilter((cur) => (cur === s ? "all" : s))}
          >
            <i />
            {FIELD_STATUS_LABELS[s]}
            <b>{counts[s]}</b>
          </button>
        ))}
      </div>

      <div
        ref={stageRef}
        className="archive-field-stage"
        onWheel={onWheel}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        role="application"
        aria-label="Archive Field map of sealed titles"
      >
        {layout === "orbit" && (
          <svg
            className="archive-field-rings"
            viewBox="0 0 1000 1000"
            aria-hidden
          >
            {[0.22, 0.38, 0.52, 0.66, 0.82].map((r) => (
              <ellipse
                key={r}
                cx="500"
                cy="500"
                rx={r * 420}
                ry={r * 420 * 0.88}
                fill="none"
                stroke="rgba(240,160,144,0.12)"
                strokeWidth="1.5"
              />
            ))}
            <circle cx="500" cy="500" r="8" fill="rgba(240,160,144,0.35)" />
          </svg>
        )}

        <div
          className="archive-field-world"
          style={{
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
          }}
        >
          {filtered.map((n) => (
            <FieldNodeView
              key={n.id}
              node={n}
              size={nodeSize(n.weight, zoom, entries.length)}
              selected={n.id === selectedId}
              compare={n.id === compareId}
              onSelect={onSelect}
            />
          ))}
        </div>

        {compareArmed ? (
          <p className="archive-field-banner" role="status">
            Compare armed — pick a second title (Esc cancels)
          </p>
        ) : null}
      </div>

      {selected && selectedNode ? (
        <aside className="archive-field-inspect" aria-label="Selected title">
          <button
            type="button"
            className="archive-field-inspect-close"
            aria-label="Close"
            onClick={() => {
              setSelectedId(null);
              setCompareId(null);
              setCompareArmed(false);
            }}
          >
            ×
          </button>
          {selected.image ? (
            <div className="archive-field-inspect-art">
              <AnimeImage
                src={selected.image}
                title={selected.title}
                width={96}
                height={144}
                sizes="96px"
              />
            </div>
          ) : null}
          <div className="archive-field-inspect-body">
            <p
              className="nx-kicker"
              style={{ color: FIELD_STATUS_COLORS[selected.watchStatus] }}
            >
              {FIELD_STATUS_LABELS[selected.watchStatus]}
            </p>
            <h3>{selected.title}</h3>
            <p className="meta">
              Progress {selected.progress}
              {selected.userRating > 0 ? ` · rated ${selected.userRating}` : ""}
              {selected.genres?.length
                ? ` · ${selected.genres.slice(0, 3).join(", ")}`
                : ""}
            </p>
            <div className="archive-field-inspect-actions">
              <Link
                href={`/anime/${selected.id}`}
                className="btn btn-accent btn-sm"
              >
                Open
              </Link>
              <button
                type="button"
                className="btn btn-outline btn-sm"
                onClick={() => setCompareArmed(true)}
              >
                {compareArmed ? "Pick second…" : "Compare"}
              </button>
            </div>
            {relationship ? (
              <p className="meta" style={{ marginTop: 12 }}>
                vs {relationship.titleB}:{" "}
                <strong>
                  {Math.round(relationship.resonanceOverlap * 100)}%
                </strong>{" "}
                model overlap
              </p>
            ) : null}
          </div>
        </aside>
      ) : (
        <p className="tools-hint archive-field-hint">
          Every sealed title is on the field — {entries.length} nodes. Click a
          cover to inspect. Layouts rearrange the same full set.
        </p>
      )}
    </div>
  );
}

function FieldNodeView({
  node,
  size,
  selected,
  compare,
  onSelect,
}: {
  node: FieldNode;
  size: number;
  selected: boolean;
  compare: boolean;
  onSelect: (id: number) => void;
}) {
  const color = FIELD_STATUS_COLORS[node.status];
  const left = `${(node.x / 1000) * 100}%`;
  const top = `${(node.y / 1000) * 100}%`;

  return (
    <button
      type="button"
      data-field-node
      className={
        "archive-field-node" +
        (selected ? " is-selected" : "") +
        (compare ? " is-compare" : "")
      }
      style={{
        left,
        top,
        width: size,
        height: size * 1.45,
        ["--node-glow" as string]: color,
        zIndex: selected || compare ? 20 : Math.round(node.weight * 10),
      }}
      title={node.title}
      aria-label={`${node.title}, ${FIELD_STATUS_LABELS[node.status]}`}
      aria-pressed={selected}
      onClick={(e) => {
        e.stopPropagation();
        onSelect(node.id);
      }}
    >
      {node.image ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={node.image} alt="" loading="lazy" draggable={false} />
      ) : (
        <span className="archive-field-node-fallback">
          {node.title.slice(0, 2)}
        </span>
      )}
      {node.progressRatio > 0.02 ? (
        <span
          className="archive-field-node-progress"
          style={{ width: `${node.progressRatio * 100}%` }}
        />
      ) : null}
    </button>
  );
}
