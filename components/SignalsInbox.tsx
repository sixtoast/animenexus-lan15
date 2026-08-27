"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  clearInbox,
  kindLabel,
  listSignals,
  markAllRead,
  pushSignal,
  type InboxSignal,
} from "@/lib/signals-inbox";

export function SignalsInbox() {
  const [items, setItems] = useState<InboxSignal[]>([]);

  const refresh = useCallback(() => {
    setItems(listSignals());
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  function onMarkRead() {
    markAllRead();
    refresh();
  }

  function onClear() {
    clearInbox();
    refresh();
  }

  function onDemo() {
    pushSignal({
      kind: "system",
      title: "Inbox online",
      body: "Signals collect here from streaming checks and tools. This is a local demo entry.",
      href: "/tools/radar",
    });
    refresh();
  }

  return (
    <div>
      <div
        className="detail-actions"
        style={{ flexWrap: "wrap", gap: 8, marginBottom: 16 }}
      >
        <button type="button" className="btn btn-outline btn-sm" onClick={onMarkRead}>
          Mark all read
        </button>
        <button type="button" className="btn btn-outline btn-sm" onClick={onClear}>
          Clear inbox store
        </button>
        <button type="button" className="btn btn-outline btn-sm" onClick={onDemo}>
          Add demo signal
        </button>
      </div>

      {items.length === 0 ? (
        <p className="tools-hint">
          No signals yet. Open anime Detail pages (streaming snapshots) or Radar
          — changes appear here when providers shift between visits.
        </p>
      ) : (
        <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
          {items.map((s) => (
            <li
              key={s.id}
              style={{
                padding: "12px 0",
                borderBottom:
                  "1px solid var(--color-border, rgba(128,128,128,0.2))",
                opacity: s.read ? 0.72 : 1,
              }}
            >
              <div
                style={{
                  display: "flex",
                  gap: 10,
                  alignItems: "baseline",
                  flexWrap: "wrap",
                }}
              >
                <span className="detail-tag" style={{ cursor: "default" }}>
                  {kindLabel(s.kind)}
                </span>
                <strong>{s.title}</strong>
                <span className="tools-hint">
                  {new Date(s.at).toLocaleString()}
                </span>
                {!s.read ? (
                  <span className="tools-hint" style={{ color: "var(--color-accent, #f0a090)" }}>
                    new
                  </span>
                ) : null}
              </div>
              <p style={{ margin: "6px 0 0", fontSize: 14 }}>{s.body}</p>
              {s.href ? (
                <p style={{ margin: "6px 0 0" }}>
                  <Link href={s.href} className="btn btn-outline btn-sm">
                    Open →
                  </Link>
                </p>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
