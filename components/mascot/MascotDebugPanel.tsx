"use client";

/**
 * Mascot debug overlay — page-world x/y (no habitat z).
 */

import { useEffect, useState } from "react";
import {
  mascotDebugSnapshot,
  type MascotDebugSnapshot,
} from "@/lib/mascot/debug-snapshot";

function row(label: string, value: string) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        gap: 8,
        fontSize: 11,
        lineHeight: 1.35,
      }}
    >
      <span style={{ opacity: 0.65 }}>{label}</span>
      <span style={{ fontFamily: "ui-monospace, monospace", textAlign: "right" }}>
        {value}
      </span>
    </div>
  );
}

export function MascotDebugPanel({
  open: openProp,
}: {
  open?: boolean;
} = {}) {
  const [snap, setSnap] = useState<MascotDebugSnapshot | null>(null);
  const [open, setOpen] = useState(!!openProp);

  useEffect(() => {
    if (!open) return;
    const tick = () => {
      try {
        setSnap(mascotDebugSnapshot());
      } catch {
        setSnap(null);
      }
    };
    tick();
    const id = window.setInterval(tick, 250);
    return () => window.clearInterval(id);
  }, [open]);

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        style={{
          position: "fixed",
          left: 8,
          bottom: 8,
          zIndex: 9999,
          fontSize: 11,
          padding: "4px 8px",
          borderRadius: 6,
          border: "1px solid rgba(255,255,255,0.2)",
          background: "rgba(0,0,0,0.55)",
          color: "#eee",
          cursor: "pointer",
        }}
      >
        mascot dbg
      </button>
    );
  }

  const s = snap;

  return (
    <div
      style={{
        position: "fixed",
        left: 8,
        bottom: 8,
        zIndex: 9999,
        width: 280,
        maxHeight: "50vh",
        overflow: "auto",
        padding: 10,
        borderRadius: 10,
        background: "rgba(8,10,18,0.88)",
        color: "#e8e8f0",
        border: "1px solid rgba(255,255,255,0.12)",
        backdropFilter: "blur(8px)",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          marginBottom: 8,
          fontSize: 12,
          fontWeight: 600,
        }}
      >
        <span>Lantern-ko debug</span>
        <button
          type="button"
          onClick={() => setOpen(false)}
          style={{
            background: "transparent",
            border: "none",
            color: "#aaa",
            cursor: "pointer",
          }}
        >
          close
        </button>
      </div>
      {s ? (
        <>
          {row("intention", s.intention)}
          {row("goal", s.goal)}
          {row("anim", s.anim)}
          {row("expression", s.expression)}
          {row(
            "pos",
            `${s.runtime.x.toFixed(2)}, ${s.runtime.y.toFixed(2)}`,
          )}
          {row(
            "target",
            s.target
              ? `${s.target.x.toFixed(2)}, ${s.target.y.toFixed(2)}`
              : "—",
          )}
          {row("phase", s.runtime.phase)}
          {row("platform", s.runtime.platformId ?? "—")}
          {row("onGround", String(s.runtime.onGround))}
          {row("speed", s.runtime.speed.toFixed(3))}
          {row(
            "command",
            s.command ? `${s.command.mode} · ${s.command.reason}` : "—",
          )}
          {row("climb", s.climbing ? s.climbPhase : "idle")}
          {row("reason", s.directorReason ?? "—")}
          {row("thought", s.thought ?? "—")}
        </>
      ) : (
        <div style={{ fontSize: 11, opacity: 0.7 }}>No snapshot yet…</div>
      )}
    </div>
  );
}
