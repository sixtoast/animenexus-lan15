"use client";

/**
 * Sprint 23 — Developer debug panel
 *
 * Visible when:
 *   localStorage anime_nexus_mascot_debug === "on"
 *   or ?mascotDebug=1
 *   or process.env.NODE_ENV === "development" && localStorage not "off"
 */

import { useEffect, useState } from "react";
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
  const expression = useMascotStore((s) => s.expression);
  const layers = useMascotStore((s) => s.layers);
  const requestAnim = useMascotStore((s) => s.requestAnim);
  const applyGoal = useMascotStore((s) => s.applyGoal);
  const setEmotions = useMascotStore((s) => s.setEmotions);

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
    <div className="mascot-debug-row">
      <span className="mascot-debug-k">{label}</span>
      <span className="mascot-debug-v">{value}</span>
    </div>
  );

  return (
    <div className="mascot-debug-root">
      <button
        type="button"
        className="mascot-debug-toggle"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-controls="mascot-debug-panel"
      >
        {open ? "Close debug" : "Mascot debug"}
      </button>

      {open ? (
        <div
          id="mascot-debug-panel"
          className="mascot-debug-panel"
          role="region"
          aria-label="Mascot developer debug"
        >
          <h3>Lantern-ko debug</h3>

          <section>
            <h4>State</h4>
            {row("anim", anim)}
            {row("goal", goal)}
            {row("intention", intention)}
            {row("context", context)}
            {row("expression", expression ?? "—")}
            {row("layers", `${layers?.locomotion ?? "—"} / ${layers?.social ?? "—"}`)}
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
            <h4>Emotions</h4>
            {Object.entries(emotions).map(([k, v]) =>
              row(k, typeof v === "number" ? v.toFixed(2) : String(v)),
            )}
          </section>

          <section>
            <h4>Personality (traits)</h4>
            {Object.entries(COMPANION.traits)
              .filter(([k]) => !k.includes("mischief"))
              .slice(0, 10)
              .map(([k, v]) => row(k, Number(v).toFixed(2)))}
          </section>

          <section>
            <h4>Trigger event</h4>
            <div className="mascot-debug-actions">
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
            <h4>Anim</h4>
            <div className="mascot-debug-actions">
              {ANIMS.map((a) => (
                <button
                  key={a}
                  type="button"
                  onClick={() => requestAnim({ anim: a, holdMs: 2000, force: true })}
                >
                  {a}
                </button>
              ))}
            </div>
          </section>

          <section>
            <h4>Goal</h4>
            <div className="mascot-debug-actions">
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
                <button key={g} type="button" onClick={() => applyGoal(g)}>
                  {g}
                </button>
              ))}
            </div>
          </section>

          <section>
            <h4>Emotion nudges</h4>
            <div className="mascot-debug-actions">
              <button
                type="button"
                onClick={() =>
                  setEmotions({
                    ...emotions,
                    happiness: Math.min(1, emotions.happiness + 0.2),
                    energy: Math.min(1, emotions.energy + 0.15),
                  })
                }
              >
                +happy
              </button>
              <button
                type="button"
                onClick={() =>
                  setEmotions({
                    ...emotions,
                    sleepiness: Math.min(1, emotions.sleepiness + 0.25),
                    energy: Math.max(0, emotions.energy - 0.15),
                  })
                }
              >
                +sleepy
              </button>
              <button
                type="button"
                onClick={() =>
                  setEmotions({
                    ...emotions,
                    curiosity: Math.min(1, emotions.curiosity + 0.25),
                    attention: Math.min(1, emotions.attention + 0.15),
                  })
                }
              >
                +curious
              </button>
              <button
                type="button"
                onClick={() =>
                  setEmotions({
                    ...emotions,
                    stress: Math.min(1, emotions.stress + 0.2),
                  })
                }
              >
                +stress
              </button>
            </div>
          </section>

          <p className="mascot-debug-hint">
            Persist: localStorage anime_nexus_mascot_debug=on · URL
            ?mascotDebug=1
          </p>
        </div>
      ) : null}

      <style jsx global>{`
        .mascot-debug-root {
          position: fixed;
          left: 8px;
          bottom: 8px;
          z-index: 99999;
          font: 11px/1.35 ui-monospace, SFMono-Regular, Menlo, monospace;
          color: #f5e6e0;
        }
        .mascot-debug-toggle {
          background: rgba(40, 24, 20, 0.92);
          color: #f5e6e0;
          border: 1px solid #f0a09088;
          border-radius: 6px;
          padding: 4px 8px;
          cursor: pointer;
        }
        .mascot-debug-panel {
          margin-top: 6px;
          width: min(320px, calc(100vw - 16px));
          max-height: min(70vh, 520px);
          overflow: auto;
          background: rgba(22, 14, 12, 0.94);
          border: 1px solid #f0a09066;
          border-radius: 8px;
          padding: 8px 10px 10px;
          box-shadow: 0 8px 24px rgba(0, 0, 0, 0.45);
        }
        .mascot-debug-panel h3 {
          margin: 0 0 6px;
          font-size: 12px;
          font-weight: 600;
        }
        .mascot-debug-panel h4 {
          margin: 8px 0 4px;
          font-size: 10px;
          text-transform: uppercase;
          letter-spacing: 0.04em;
          color: #f0a090;
        }
        .mascot-debug-row {
          display: flex;
          justify-content: space-between;
          gap: 8px;
        }
        .mascot-debug-k {
          color: #c4a99f;
        }
        .mascot-debug-v {
          text-align: right;
          word-break: break-all;
        }
        .mascot-debug-actions {
          display: flex;
          flex-wrap: wrap;
          gap: 4px;
        }
        .mascot-debug-actions button {
          background: #3a2824;
          color: #f5e6e0;
          border: 1px solid #664840;
          border-radius: 4px;
          padding: 2px 6px;
          font: inherit;
          cursor: pointer;
        }
        .mascot-debug-actions button:hover {
          border-color: #f0a090;
        }
        .mascot-debug-hint {
          margin: 8px 0 0;
          color: #8a7068;
          font-size: 10px;
        }
      `}</style>
    </div>
  );
}
