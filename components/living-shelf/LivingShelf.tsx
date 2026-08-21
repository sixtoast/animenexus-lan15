"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import type { WatchlistEntry } from "@/lib/types";
import { projectShelfObjects, type ShelfObject } from "@/lib/living-shelf";
import { describeShelfPair, type ShelfRelationship } from "@/lib/shelf-resonance";
import { getCinematography } from "@/lib/cinematography-store";
import { ShelfFallback } from "./ShelfFallback";
import { ShelfHUD } from "./ShelfHUD";
import { ShelfResonancePanel } from "./ShelfResonancePanel";

const ShelfScene = dynamic(
  () => import("./ShelfScene").then((m) => m.ShelfScene),
  {
    ssr: false,
    loading: () => (
      <div className="shelf-canvas-loading" role="status">
        Staging shelf…
      </div>
    ),
  },
);

function webglOk(): boolean {
  if (typeof document === "undefined") return false;
  try {
    const c = document.createElement("canvas");
    return !!(c.getContext("webgl2") || c.getContext("webgl"));
  } catch {
    return false;
  }
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

/** Stable flat order for keyboard navigation. */
function orderedIds(objects: ShelfObject[]): number[] {
  const order = ["watching", "planning", "paused", "completed", "dropped"] as const;
  const ids: number[] = [];
  for (const c of order) {
    for (const o of objects) {
      if (o.cluster === c) ids.push(o.animeId);
    }
  }
  return ids;
}

export function LivingShelf({ entries }: { entries: WatchlistEntry[] }) {
  const objects = useMemo(() => projectShelfObjects(entries), [entries]);
  const ids = useMemo(() => orderedIds(objects), [objects]);
  const byId = useMemo(() => {
    const m = new Map<number, WatchlistEntry>();
    for (const e of entries) m.set(e.id, e);
    return m;
  }, [entries]);

  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [compareId, setCompareId] = useState<number | null>(null);
  const [compareArmed, setCompareArmed] = useState(false);
  const [gl, setGl] = useState(true);
  const [camKey, setCamKey] = useState(0);
  const [announce, setAnnounce] = useState("");

  useEffect(() => {
    setGl(webglOk());
    getCinematography().setFocus("watchlist");
  }, []);

  const selected: ShelfObject | null = useMemo(
    () => objects.find((o) => o.animeId === selectedId) ?? null,
    [objects, selectedId],
  );

  const relationship: ShelfRelationship | null = useMemo(() => {
    if (selectedId == null || compareId == null) return null;
    const a = byId.get(selectedId);
    const b = byId.get(compareId);
    if (!a || !b) return null;
    return describeShelfPair(a, b);
  }, [selectedId, compareId, byId]);

  const onSelect = useCallback(
    (id: number) => {
      if (compareArmed && selectedId != null && id !== selectedId) {
        setCompareId(id);
        setCompareArmed(false);
        const a = byId.get(selectedId);
        const b = byId.get(id);
        setAnnounce(
          a && b
            ? `Compared ${a.title} with ${b.title}.`
            : "Resonance pair set.",
        );
        getCinematography().pulse(
          {
            focus: "recommendation",
            backgroundEmphasis: 0.22,
            foregroundEmphasis: 0.55,
            lanternAttention: 0.7,
            vignette: 0.12,
          },
          2200,
        );
        return;
      }
      setSelectedId(id);
      setCompareId(null);
      const e = byId.get(id);
      setAnnounce(e ? `Selected ${e.title}.` : "Selected.");
      getCinematography().pulse(
        {
          focus: "anime",
          subjectId: id,
          backgroundEmphasis: 0.2,
          foregroundEmphasis: 0.55,
          lanternAttention: 0.6,
          vignette: 0.1,
        },
        1800,
      );
    },
    [compareArmed, selectedId, byId],
  );

  const moveFocus = useCallback(
    (delta: number) => {
      if (!ids.length) return;
      const cur =
        selectedId != null ? ids.indexOf(selectedId) : -1;
      let next = cur + delta;
      if (next < 0) next = ids.length - 1;
      if (next >= ids.length) next = 0;
      onSelect(ids[next]);
    },
    [ids, selectedId, onSelect],
  );

  const onResetCamera = useCallback(() => {
    setCamKey((k) => k + 1);
    setSelectedId(null);
    setCompareId(null);
    setCompareArmed(false);
    setAnnounce("View reset.");
  }, []);

  const clearPair = useCallback(() => {
    setCompareId(null);
    setCompareArmed(false);
    setAnnounce("Compare cleared.");
  }, []);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "SELECT" || tag === "TEXTAREA") return;

      if (e.key === "Escape") {
        if (compareId != null || compareArmed) {
          clearPair();
          return;
        }
        setSelectedId(null);
        setAnnounce("Selection cleared.");
        return;
      }
      if (e.key === "ArrowRight" || e.key === "ArrowDown") {
        e.preventDefault();
        moveFocus(1);
        return;
      }
      if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
        e.preventDefault();
        moveFocus(-1);
        return;
      }
      if ((e.key === "c" || e.key === "C") && selectedId != null) {
        setCompareArmed(true);
        setAnnounce("Compare armed. Select a second title.");
        return;
      }
      if (e.key === "Enter" && selectedId != null && !compareArmed) {
        window.location.href = `/anime/${selectedId}`;
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selectedId, compareId, compareArmed, clearPair, moveFocus]);

  if (!objects.length) {
    return (
      <div className="state-box lantern-empty">
        <h3>Empty archive</h3>
        <p>Seal titles in Manage mode — the spatial shelf projects from your list.</p>
      </div>
    );
  }

  const a11yHelp =
    "Keyboard: arrows move selection, C compares, Enter opens detail, Escape clears.";

  if (!gl) {
    return (
      <div>
        <p className="sr-only" role="status">
          {a11yHelp}
        </p>
        <ShelfFallback objects={objects} onSelect={onSelect} />
        {relationship ? (
          <ShelfResonancePanel rel={relationship} onClear={clearPair} />
        ) : null}
        <div className="sr-only" aria-live="polite">
          {announce}
        </div>
      </div>
    );
  }

  return (
    <div
      className="living-shelf"
      data-shelf-objects={objects.length}
      role="application"
      aria-label="Living Shelf spatial collection"
    >
      <p className="tools-hint shelf-a11y-hint" id="shelf-kbd-help">
        {a11yHelp} Prefer the list? Switch to <strong>Manage</strong>.
      </p>
      <div className="living-shelf-stage" aria-describedby="shelf-kbd-help">
        <ShelfScene
          key={camKey}
          objects={objects}
          selectedId={selectedId}
          compareId={compareId}
          onSelect={onSelect}
          reducedMotion={reducedMotionNow()}
        />
      </div>
      <ShelfHUD
        selected={selected}
        compareArmed={compareArmed}
        hasPair={compareId != null}
        onClose={() => {
          setSelectedId(null);
          clearPair();
        }}
        onResetCamera={onResetCamera}
        onArmCompare={() => {
          setCompareArmed(true);
          setAnnounce("Compare armed. Select a second title.");
        }}
        onClearPair={clearPair}
      />
      {relationship ? (
        <ShelfResonancePanel rel={relationship} onClear={clearPair} />
      ) : null}
      {compareArmed && !relationship ? (
        <p className="tools-hint" role="status">
          Compare armed — click or arrow to a second title (Escape cancels).
        </p>
      ) : null}
      <div className="sr-only" aria-live="polite" aria-atomic="true">
        {announce}
      </div>
    </div>
  );
}
