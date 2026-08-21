"use client";

/**
 * Memory Room experience (Awwwards Sprint 9).
 * Editorial / spatial depth — not a literal 3D room.
 * Timeline remains available as a separate mode.
 */

import { useMemo, useState } from "react";
import Link from "next/link";
import type { MemoryChapter, MemoryEvent } from "@/lib/memory-room";
import { getCinematography } from "@/lib/cinematography-store";

export function MemoryRoom({
  events,
  chapters,
}: {
  events: MemoryEvent[];
  chapters: MemoryChapter[];
}) {
  const [focusId, setFocusId] = useState<string | null>(null);

  const focused = useMemo(
    () => events.find((e) => e.id === focusId) ?? null,
    [events, focusId],
  );

  // Stable positions from importance + index (no WebGL required)
  const placed = useMemo(() => {
    return events.map((e, i) => {
      const col = i % 4;
      const row = Math.floor(i / 4);
      const depth = 1 - e.importance; // important → closer
      return {
        event: e,
        style: {
          "--mr-x": `${col * 24 + (e.importance * 4)}%`,
          "--mr-y": `${12 + row * 18}%`,
          "--mr-scale": `${0.72 + e.importance * 0.4}`,
          "--mr-opacity": `${0.4 + e.importance * 0.55}`,
          "--mr-z": Math.round(e.importance * 20),
          transform: `translateZ(${(1 - depth) * 40}px) scale(var(--mr-scale))`,
          opacity: `var(--mr-opacity)`,
          zIndex: Math.round(e.importance * 20),
        } as React.CSSProperties,
      };
    });
  }, [events]);

  function focus(id: string) {
    setFocusId(id);
    getCinematography().pulse(
      {
        focus: "memory",
        depth: "immersive",
        backgroundEmphasis: 0.25,
        foregroundEmphasis: 0.6,
        vignette: 0.16,
        lanternAttention: 0.4,
      },
      2000,
    );
  }

  if (!events.length) {
    return (
      <div className="state-box">
        <p>No milestones yet. Browse, seal, and complete to fill this path.</p>
        <Link href="/browse" className="btn btn-accent btn-sm">
          Browse →
        </Link>
      </div>
    );
  }

  return (
    <div className="memory-room">
      {chapters.length > 0 ? (
        <div className="memory-room-chapters" role="list">
          {chapters.map((ch) => (
            <button
              key={ch.id}
              type="button"
              className="memory-room-chapter-chip"
              role="listitem"
              onClick={() => {
                const first = ch.eventIds[0];
                if (first) focus(first);
              }}
            >
              {ch.title}
            </button>
          ))}
        </div>
      ) : null}

      <div
        className="memory-room-field"
        data-has-focus={focused ? "true" : "false"}
        aria-label="Memory field"
      >
        {placed.map(({ event: e, style }) => {
          const isFocus = focusId === e.id;
          const dimmed = focusId != null && !isFocus;
          return (
            <button
              key={e.id}
              type="button"
              className={
                "memory-node" +
                (isFocus ? " is-focus" : "") +
                (dimmed ? " is-dim" : "")
              }
              style={style}
              onClick={() => focus(e.id)}
              aria-pressed={isFocus}
              aria-label={`${e.title}. ${e.body}`}
            >
              <span className="memory-node-kind">{e.kind.replace(/_/g, " ")}</span>
              <span className="memory-node-title">{e.title}</span>
            </button>
          );
        })}
      </div>

      {focused ? (
        <aside className="memory-focus-panel" aria-live="polite">
          <p className="nx-kicker">
            {focused.at.slice(0, 10)}
            {focused.chapter ? ` · ${focused.chapter.replace(/_/g, " ")}` : ""}
          </p>
          <h3>{focused.title}</h3>
          <p>{focused.body}</p>
          {focused.resonanceNote ? (
            <p className="tools-hint">{focused.resonanceNote}</p>
          ) : null}
          <p className="tools-hint">
            Significance in your AnimeNexus history:{" "}
            {Math.round(focused.importance * 100)}%
          </p>
          <div className="memory-focus-actions">
            {focused.href ? (
              <Link href={focused.href} className="btn btn-accent btn-sm">
                Open related
              </Link>
            ) : null}
            <button
              type="button"
              className="btn btn-outline btn-sm"
              onClick={() => setFocusId(null)}
            >
              Back to field
            </button>
          </div>
        </aside>
      ) : (
        <p className="tools-hint memory-room-hint">
          Select a memory — closer, larger nodes are more significant in your
          desk history.
        </p>
      )}
    </div>
  );
}
