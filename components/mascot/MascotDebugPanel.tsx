"use client";

/**
 * Sprint 23 — Developer debug panel
 *
 * Visible when:
 *   localStorage anime_nexus_mascot_debug === "on"
 *   or ?mascotDebug=1
 *   or NODE_ENV === "development" && localStorage not "off"
 */

import { useEffect, useState, type CSSProperties } from "react";
import { useMascotStore, mascotNotify } from "@/lib/mascot/store";
import { COMPANION } from "@/lib/mascot/personality";
import { bondStage, getMemory } from "@/lib/mascot/memory";
import { getPerfCounters } from "@/lib/mascot/performance";
import type { MascotAnim } from "@/lib/mascot/types";

function useFps(active: boolean) {
  const [fps, setFps] = useState(0);
  useEffect(() => {
    if (!active) return;
    let frames = 0;
    let last = performance.now();
    let raf = 0;
    const loop = (t: number) => {
      frames += 1;
      if (t - last >= 1000) {
        setFps(frames);
        frames = 0;
        last = t;
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [active]);
  return fps;
}

function shouldShowDebug(): boolean {
  if (typeof window === "undefined") return false;
  try {
    const params = new URLSearchParams(window.location.search);
    if (params.get("mascotDebug") === "1") return true;
    const saved = localStorage.getItem("anime_nexus_mascot_debug");
    if (saved === "on") return true;
    if (saved === "off") return false;
  } catch {
    /* */
  }
  return process.env.NODE_ENV === "development";
}

const ANIMS: MascotAnim[] = [
  "idle",
  "walk",
  "jump",
  "land",
  "wave",
  "point",
  "think",
  "happy",
  "surprised",
  "sleep",
];

const rootStyle: CSSProperties = {
  position: "fixed",
  left: 8,
  bottom: 8,
  zIndex: 99999,
  font: "11px/1.35 ui-monospace, SFMono-Regular, Menlo, monospace",
  color: "#f5e6e0",
};

const toggleStyle: CSSProperties = {
  background: "rgba(40, 24, 20, 0.92)",
  color: "#f5e6e0",
  border: "1px solid #f0a09088",
  borderRadius: 6,
  padding: "4px 8px",
  cursor: "pointer",
};

const panelStyle: CSSProperties = {
  marginTop: 6,
  width: "min(320px, calc(100vw - 16px))",
  maxHeight: "min(70vh, 520px)",
  overflow: "auto",
  background: "rgba(22, 14, 12, 0.94)",
  border: "1px solid #f0a09066",
  borderRadius: 8,
  padding: "8px 10px 10px",
  boxShadow: "0 8px 24px rgba(0, 0, 0, 0.45)",
};

const btnStyle: CSSProperties = {
  background: "#3a2824",
  color: "#f5e6e0",
  border: "1px solid #664840",
  borderRadius: 4,
  padding: "2px 6px",
  font: "inherit",
  cursor: "pointer",
};

export function MascotDebugPanel() {
  const [open, setOpen] = useState(false);
  const [allowed, setAllowed] = useState(false);
  const [tick, setTick] = useState(0);
  const fps = useFps(open && allowed);

  const anim = useMascotStore((s) => s.anim);
  const goal = useMascotStore((s) => s.goal);
  const intention = useMascotStore((s) => s.intention);
  const context = useMascotStore((s) => s.context);
  const emotions = useMascotStore((s) => s.emotions);
  const position = useMascotStore((s) => s.position);
  const target = useMascotStore((s) => s.target);
  const lastThought = useMascotStore((s) => s.lastThought);
  const lastDirectorReason = useMascotStore((s) => s.lastDirectorReason);
  const layers = useMascotStore((s) => s.layers);
  const cursorRelation = useMascotStore((s) => s.cursorRelation);
  const lastLandmarkType = useMascotStore((s) => s.lastLandmarkType);
  const requestAnim = useMascotStore((s) => s.requestAnim);
  const applyGoal = useMascotStore((s) => s.applyGoal);
  const bumpEmotion = useMascotStore((s) => s.bumpEmotion);

  useEffect(() => {
    setAllowed(shouldShowDebug());
  }, []);

  useEffect(() => {
    if (!open) return;
    const id = window.setInterval(() => setTick((n) => n + 1), 500);
    return () => window.clearInterval(id);
  }, [open]);

  if (!allowed) return null;

  const mem = getMemory();
  const stage = bondStage(mem);
  const perf = getPerfCounters();
  void tick;

  const row = (label: string, value: string | number) => (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        gap: 8,
      }}
    >
      <span style={{ color: "#c4a99f" }}>{label}</span>
      <span style={{ textAlign: "right", wordBreak: "break-all" }}>
        {value}
      </span>
    </div>
  );

  return (
    <div style={rootStyle}>
      <button
        type="button"
        style={toggleStyle}
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-controls="mascot-debug-panel"
      >
        {open ? "Close debug" : "Mascot debug"}
      </button>

      {open ? (
        <div
          id="mascot-debug-panel"
          style={panelStyle}
          role="region"
          aria-label="Mascot developer debug"
        >
          <h3 style={{ margin: "0 0 6px", fontSize: 12 }}>Lantern-ko debug</h3>

          <section>
            <h4
              style={{
                margin: "8px 0 4px",
                fontSize: 10,
                textTransform: "uppercase",
                color: "#f0a090",
              }}
            >
              State
            </h4>
            {row("anim", anim)}
            {row("goal", goal)}
            {row("intention", intention)}
            {row("context", context)}
            {row(
              "layers",
              `${layers.locomotion} / ${layers.social}`,
            )}
            {row("cursor", cursorRelation)}
            {row("landmark", lastLandmarkType ?? "—")}
            {row("thought", lastThought || "—")}
            {row("director", lastDirectorReason || "—")}
            {row(
              "pos",
              `${position.x.toFixed(2)}, ${position.z.toFixed(2)}`,
            )}
            {row(
              "target",
              target
                ? `${target.x.toFixed(2)}, ${target.z.toFixed(2)}`
                : "none",
            )}
            {row("bond", stage)}
            {row("FPS", fps)}
            {row("terrain builds", perf.terrainBuilds)}
            {row("last terrain ms", perf.lastTerrainMs.toFixed(1))}
          </section>

          <section>
            <h4
              style={{
                margin: "8px 0 4px",
                fontSize: 10,
                textTransform: "uppercase",
                color: "#f0a090",
              }}
            >
              Emotions
            </h4>
            {Object.entries(emotions).map(([k, v]) =>
              row(k, typeof v === "number" ? v.toFixed(2) : String(v)),
            )}
          </section>

          <section>
            <h4
              style={{
                margin: "8px 0 4px",
                fontSize: 10,
                textTransform: "uppercase",
                color: "#f0a090",
              }}
            >
              Personality
            </h4>
            {Object.entries(COMPANION.traits)
              .filter(([k]) => k !== "mischief")
              .slice(0, 10)
              .map(([k, v]) => row(k, Number(v).toFixed(2)))}
          </section>

          <section>
            <h4
              style={{
                margin: "8px 0 4px",
                fontSize: 10,
                textTransform: "uppercase",
                color: "#f0a090",
              }}
            >
              Trigger event
            </h4>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
              {(
                [
                  "pet",
                  "seal",
                  "complete",
                  "idle-long",
                  "search",
                  "modal-open",
                  "error",
                ] as const
              ).map((ev) => (
                <button
                  key={ev}
                  type="button"
                  style={btnStyle}
                  onClick={() => {
                    try {
                      mascotNotify({ type: ev } as never);
                    } catch {
                      /* */
                    }
                  }}
                >
                  {ev}
                </button>
              ))}
            </div>
          </section>

          <section>
            <h4
              style={{
                margin: "8px 0 4px",
                fontSize: 10,
                textTransform: "uppercase",
                color: "#f0a090",
              }}
            >
              Anim
            </h4>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
              {ANIMS.map((a) => (
                <button
                  key={a}
                  type="button"
                  style={btnStyle}
                  onClick={() =>
                    requestAnim({ anim: a, holdMs: 2000, force: true })
                  }
                >
                  {a}
                </button>
              ))}
            </div>
          </section>

          <section>
            <h4
              style={{
                margin: "8px 0 4px",
                fontSize: 10,
                textTransform: "uppercase",
                color: "#f0a090",
              }}
            >
              Goal
            </h4>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
              {(
                [
                  "idle",
                  "wander",
                  "nap",
                  "ponder",
                  "seek-attention",
                  "celebrate",
                ] as const
              ).map((g) => (
                <button
                  key={g}
                  type="button"
                  style={btnStyle}
                  onClick={() => applyGoal(g)}
                >
                  {g}
                </button>
              ))}
            </div>
          </section>

          <section>
            <h4
              style={{
                margin: "8px 0 4px",
                fontSize: 10,
                textTransform: "uppercase",
                color: "#f0a090",
              }}
            >
              Emotion nudges
            </h4>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
              <button
                type="button"
                style={btnStyle}
                onClick={() => {
                  bumpEmotion("happiness", 0.2);
                  bumpEmotion("energy", 0.15);
                }}
              >
                +happy
              </button>
              <button
                type="button"
                style={btnStyle}
                onClick={() => {
                  bumpEmotion("sleepiness", 0.25);
                  bumpEmotion("energy", -0.15);
                }}
              >
                +sleepy
              </button>
              <button
                type="button"
                style={btnStyle}
                onClick={() => {
                  bumpEmotion("curiosity", 0.25);
                  bumpEmotion("attention", 0.15);
                }}
              >
                +curious
              </button>
              <button
                type="button"
                style={btnStyle}
                onClick={() => bumpEmotion("stress", 0.2)}
              >
                +stress
              </button>
            </div>
          </section>

          <p style={{ margin: "8px 0 0", color: "#8a7068", fontSize: 10 }}>
            Persist: localStorage anime_nexus_mascot_debug=on · URL
            ?mascotDebug=1
          </p>
        </div>
      ) : null}
    </div>
  );
}
