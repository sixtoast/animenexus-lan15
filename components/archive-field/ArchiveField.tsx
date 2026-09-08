"use client";

/**
 * Archive Field — every sealed title as a 3D node.
 * Practical list picker + Orbit / Constellation / Timeline scenes.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import type { WatchlistEntry, WatchStatus } from "@/lib/types";
import {
  countByStatus,
  FIELD_STATUS_COLORS,
  FIELD_STATUS_LABELS,
  projectFieldNodes,
  type FieldLayoutMode,
} from "@/lib/archive-field";
import { describeShelfPair } from "@/lib/shelf-resonance";
import { playCue } from "@/lib/sound-engine";
import { AnimeImage } from "@/components/AnimeImage";

const FieldScene3D = dynamic(
  () => import("./FieldScene3D").then((m) => m.FieldScene3D),
  {
    ssr: false,
    loading: () => (
      <div className="archive-field-canvas-loading" role="status">
        Staging field…
      </div>
    ),
  },
);

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

function reducedMotionNow(): boolean {
  if (typeof document === "undefined") return true;
  if (document.documentElement.getAttribute("data-reduce-motion") === "true")
    return true;
  try {
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  } catch {
    return false;
  }
}

export function ArchiveField({ entries }: { entries: WatchlistEntry[] }) {
  const [layout, setLayout] = useState<FieldLayoutMode>("orbit");
  const [statusFilter, setStatusFilter] = useState<WatchStatus | "all">("all");
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [compareId, setCompareId] = useState<number | null>(null);
  const [compareArmed, setCompareArmed] = useState(false);
  const [focusId, setFocusId] = useState<number | null>(null);
  const [listOpen, setListOpen] = useState(true);
  const listRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

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

  const selectTitle = useCallback(
    (id: number, opts?: { focus?: boolean }) => {
      if (compareArmed && selectedId != null && id !== selectedId) {
        setCompareId(id);
        setCompareArmed(false);
        playCue("resonance");
        return;
      }
      setSelectedId(id);
      setCompareId(null);
      if (opts?.focus !== false) setFocusId(id);
      playCue("shelf_settle");
      requestAnimationFrame(() => {
        const el = listRef.current?.querySelector(
          `[data-list-id="${id}"]`,
        ) as HTMLElement | null;
        el?.scrollIntoView({ block: "nearest", behavior: "smooth" });
      });
    },
    [compareArmed, selectedId],
  );

  const moveListSelection = useCallback(
    (delta: number) => {
      if (!filtered.length) return;
      const idx =
        selectedId != null
          ? filtered.findIndex((n) => n.id === selectedId)
          : -1;
      let next = idx + delta;
      if (next < 0) next = filtered.length - 1;
      if (next >= filtered.length) next = 0;
      selectTitle(filtered[next].id);
    },
    [filtered, selectedId, selectTitle],
  );

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const tag = (e.target as HTMLElement)?.tagName;
      const inSearch = (e.target as HTMLElement)?.classList?.contains(
        "archive-field-search",
      );
      if (tag === "TEXTAREA" || tag === "SELECT") return;
      if (tag === "INPUT" && !inSearch) return;

      if (e.key === "Escape") {
        setCompareArmed(false);
        setCompareId(null);
        setSelectedId(null);
        setFocusId(null);
        return;
      }
      if ((e.key === "c" || e.key === "C") && selectedId != null && !inSearch) {
        setCompareArmed(true);
        return;
      }
      if (e.key === "Enter" && selectedId != null && !inSearch) {
        window.location.href = `/anime/${selectedId}`;
        return;
      }
      if (e.key === "ArrowDown" && !inSearch) {
        e.preventDefault();
        moveListSelection(1);
        return;
      }
      if (e.key === "ArrowUp" && !inSearch) {
        e.preventDefault();
        moveListSelection(-1);
        return;
      }
      if (
        (e.key === "/" || e.key === "f") &&
        !inSearch &&
        !(e.metaKey || e.ctrlKey)
      ) {
        e.preventDefault();
        setListOpen(true);
        searchRef.current?.focus();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selectedId, moveListSelection]);

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
    <div className="archive-field archive-field--3d" data-layout={layout}>
      <header className="archive-field-toolbar">
        <div className="archive-field-modes" role="group" aria-label="3D layout">
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

        <div className="archive-field-cam">
          <button
            type="button"
            className="btn btn-outline btn-sm"
            onClick={() => setListOpen((o) => !o)}
            aria-pressed={listOpen}
          >
            {listOpen ? "Hide list" : "Show list"}
          </button>
          <button
            type="button"
            className="btn btn-outline btn-sm"
            onClick={() => {
              setFocusId(null);
              setSelectedId(null);
            }}
          >
            Clear selection
          </button>
          <span className="meta">
            {filtered.length} of {entries.length} · drag to orbit · scroll to
            zoom · <kbd>/</kbd> search
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

      <div className={"archive-field-body" + (listOpen ? " has-list" : "")}>
        {listOpen ? (
          <aside className="archive-field-list" aria-label="Pick a title">
            <div className="archive-field-list-head">
              <input
                ref={searchRef}
                className="filter-input archive-field-search"
                placeholder="Search titles…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                aria-label="Search titles in the field"
              />
              <select
                className="filter-input"
                value={statusFilter}
                onChange={(e) =>
                  setStatusFilter(e.target.value as WatchStatus | "all")
                }
                aria-label="Filter by status"
              >
                <option value="all">All ({entries.length})</option>
                {(Object.keys(FIELD_STATUS_LABELS) as WatchStatus[]).map(
                  (s) => (
                    <option key={s} value={s}>
                      {FIELD_STATUS_LABELS[s]} ({counts[s]})
                    </option>
                  ),
                )}
              </select>
            </div>
            <div
              className="archive-field-list-scroll"
              ref={listRef}
              role="listbox"
            >
              {filtered.length === 0 ? (
                <p className="meta" style={{ padding: 12 }}>
                  No titles match.
                </p>
              ) : (
                filtered.map((n) => {
                  const active = n.id === selectedId;
                  const cmp = n.id === compareId;
                  return (
                    <button
                      key={n.id}
                      type="button"
                      role="option"
                      data-list-id={n.id}
                      aria-selected={active}
                      className={
                        "archive-field-list-row" +
                        (active ? " is-selected" : "") +
                        (cmp ? " is-compare" : "")
                      }
                      onClick={() => selectTitle(n.id)}
                      onDoubleClick={() => {
                        window.location.href = `/anime/${n.id}`;
                      }}
                    >
                      <span
                        className="archive-field-list-dot"
                        style={{ background: FIELD_STATUS_COLORS[n.status] }}
                      />
                      {n.image ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={n.image}
                          alt=""
                          className="archive-field-list-thumb"
                        />
                      ) : (
                        <span className="archive-field-list-thumb is-empty" />
                      )}
                      <span className="archive-field-list-meta">
                        <span className="archive-field-list-title">
                          {n.title}
                        </span>
                        <span className="meta">
                          {FIELD_STATUS_LABELS[n.status]}
                          {n.progress > 0 ? ` · ep ${n.progress}` : ""}
                        </span>
                      </span>
                    </button>
                  );
                })
              )}
            </div>
            <p className="archive-field-list-hint meta">
              Click to select & fly camera · double-click to open · ↑↓ keys
            </p>
          </aside>
        ) : null}

        <div className="archive-field-stage archive-field-stage--3d">
          <FieldScene3D
            nodes={filtered}
            selectedId={selectedId}
            compareId={compareId}
            focusId={focusId}
            onSelect={(id) => selectTitle(id)}
            reducedMotion={reducedMotionNow()}
          />
          {compareArmed ? (
            <p className="archive-field-banner" role="status">
              Compare armed — pick a second title from the list or field (Esc
              cancels)
            </p>
          ) : null}
        </div>
      </div>

      {selected ? (
        <aside className="archive-field-inspect" aria-label="Selected title">
          <button
            type="button"
            className="archive-field-inspect-close"
            aria-label="Close"
            onClick={() => {
              setSelectedId(null);
              setCompareId(null);
              setCompareArmed(false);
              setFocusId(null);
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
                onClick={() => setFocusId(selected.id)}
              >
                Focus in 3D
              </button>
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
          Use the list to pick any title — camera flies to it in the 3D{" "}
          {layout} field. All {entries.length} sealed titles are placed.
        </p>
      )}
    </div>
  );
}
