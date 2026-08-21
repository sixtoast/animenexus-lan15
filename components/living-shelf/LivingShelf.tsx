"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import type { WatchlistEntry } from "@/lib/types";
import { projectShelfObjects, type ShelfObject } from "@/lib/living-shelf";
import { getCinematography } from "@/lib/cinematography-store";
import { ShelfFallback } from "./ShelfFallback";
import { ShelfHUD } from "./ShelfHUD";

const ShelfScene = dynamic(
  () => import("./ShelfScene").then((m) => m.ShelfScene),
  { ssr: false, loading: () => <div className="shelf-canvas-loading">Staging shelf…</div> },
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
  const [selectedId, setSelectedId] = useState<number | null>(null);
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

  const onSelect = useCallback((id: number) => {
    setSelectedId(id);
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
  }, []);

  const onResetCamera = useCallback(() => {
    setCamKey((k) => k + 1);
    setSelectedId(null);
  }, []);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setSelectedId(null);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  if (!objects.length) {
    return (
      <div className="state-box lantern-empty">
        <h3>Empty archive</h3>
        <p>Seal titles in Manage mode — the spatial shelf projects from your list.</p>
      </div>
    );
  }

  if (!gl) {
    return <ShelfFallback objects={objects} onSelect={onSelect} />;
  }

  return (
    <div className="living-shelf" data-shelf-objects={objects.length}>
      <div className="living-shelf-stage">
        <ShelfScene
          key={camKey}
          objects={objects}
          selectedId={selectedId}
          onSelect={onSelect}
          reducedMotion={reducedMotionNow()}
        />
      </div>
      <ShelfHUD
        selected={selected}
        onClose={() => setSelectedId(null)}
        onResetCamera={onResetCamera}
      />
    </div>
  );
}
