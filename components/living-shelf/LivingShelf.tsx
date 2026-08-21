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
      <div className="shelf-canvas-loading">Staging shelf…</div>
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

export function LivingShelf({ entries }: { entries: WatchlistEntry[] }) {
  const objects = useMemo(() => projectShelfObjects(entries), [entries]);
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
    [compareArmed, selectedId],
  );

  const onResetCamera = useCallback(() => {
    setCamKey((k) => k + 1);
    setSelectedId(null);
    setCompareId(null);
    setCompareArmed(false);
  }, []);

  const clearPair = useCallback(() => {
    setCompareId(null);
    setCompareArmed(false);
  }, []);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        if (compareId != null || compareArmed) {
          clearPair();
          return;
        }
        setSelectedId(null);
      }
      // C = arm compare when something is selected
      if ((e.key === "c" || e.key === "C") && selectedId != null) {
        setCompareArmed(true);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selectedId, compareId, compareArmed, clearPair]);

  if (!objects.length) {
    return (
      <div className="state-box lantern-empty">
        <h3>Empty archive</h3>
        <p>Seal titles in Manage mode — the spatial shelf projects from your list.</p>
      </div>
    );
  }

  if (!gl) {
    return (
      <div>
        <ShelfFallback objects={objects} onSelect={onSelect} />
        {relationship ? (
          <ShelfResonancePanel rel={relationship} onClear={clearPair} />
        ) : null}
      </div>
    );
  }

  return (
    <div className="living-shelf" data-shelf-objects={objects.length}>
      <div className="living-shelf-stage">
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
        onArmCompare={() => setCompareArmed(true)}
        onClearPair={clearPair}
      />
      {relationship ? (
        <ShelfResonancePanel rel={relationship} onClear={clearPair} />
      ) : null}
      {compareArmed && !relationship ? (
        <p className="tools-hint" role="status">
          Compare armed — click a second poster (or press Escape to cancel).
        </p>
      ) : null}
    </div>
  );
}
