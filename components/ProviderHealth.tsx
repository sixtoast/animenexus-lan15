"use client";

import { useEffect, useState } from "react";

type Status = "ok" | "degraded" | "down" | "unknown";

type Row = {
  id: string;
  label: string;
  status: Status;
  note?: string;
};

/**
 * Soft provider health — never blocks the desk.
 * Uses lightweight HEAD/GET probes when possible; fails open.
 */
export function ProviderHealth() {
  const [rows, setRows] = useState<Row[]>([
    { id: "anilist", label: "AniList", status: "unknown" },
    { id: "jikan", label: "Jikan / MAL", status: "unknown" },
  ]);

  useEffect(() => {
    let cancelled = false;
    async function probe() {
      const next: Row[] = [];

      // AniList GraphQL soft probe
      try {
        const res = await fetch("https://graphql.anilist.co", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            query: "{ Page(page:1,perPage:1){ media{ id } } }",
          }),
        });
        next.push({
          id: "anilist",
          label: "AniList",
          status: res.ok ? "ok" : "degraded",
          note: res.ok ? undefined : `HTTP ${res.status}`,
        });
      } catch {
        next.push({
          id: "anilist",
          label: "AniList",
          status: "down",
          note: "Unreachable from this browser",
        });
      }

      try {
        const res = await fetch("https://api.jikan.moe/v4/anime/1", {
          method: "GET",
        });
        next.push({
          id: "jikan",
          label: "Jikan / MAL",
          status: res.ok ? "ok" : res.status === 429 ? "degraded" : "down",
          note:
            res.status === 429
              ? "Rate limited — shelves may thin"
              : res.ok
                ? undefined
                : `HTTP ${res.status}`,
        });
      } catch {
        next.push({
          id: "jikan",
          label: "Jikan / MAL",
          status: "down",
          note: "Unreachable",
        });
      }

      if (!cancelled) setRows(next);
    }
    void probe();
    return () => {
      cancelled = true;
    };
  }, []);

  const bad = rows.filter((r) => r.status !== "ok" && r.status !== "unknown");
  if (!bad.length && rows.every((r) => r.status === "unknown")) return null;
  if (!bad.length) return null;

  return (
    <div className="provider-health" role="status">
      <span className="provider-health-label">Signals</span>
      {rows.map((r) => (
        <span
          key={r.id}
          className={`provider-pill provider-pill--${r.status}`}
          title={r.note || r.label}
        >
          {r.label}
          {r.status === "ok"
            ? " · ok"
            : r.status === "degraded"
              ? " · slow"
              : r.status === "down"
                ? " · down"
                : ""}
        </span>
      ))}
    </div>
  );
}
