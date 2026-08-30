/**
 * Taste drift / trend detection across time windows.
 * Requires repeated evidence before declaring a shift.
 */

import type { WatchlistEntry } from "./types";
import { recentEvents } from "./behaviour-events";

export type TasteTrend = {
  dimension: string;
  direction: "up" | "down" | "stable";
  strength: number;
  confidence: number;
  evidenceCount: number;
};

export type WindowProfile = {
  label: string;
  days: number;
  dims: Record<string, number>;
};

function windowDims(
  entries: WatchlistEntry[],
  days: number,
): Record<string, number> {
  const cut = Date.now() - days * 24 * 60 * 60 * 1000;
  const dims: Record<string, number> = {};

  for (const e of entries) {
    const updated = e.updatedAt ? new Date(e.updatedAt).getTime() : 0;
    if (days < 9999 && updated && updated < cut) continue;
    const w =
      e.status === "completed" || e.status === "rewatching"
        ? 3
        : e.status === "watching"
          ? 2
          : 1;
    for (const g of e.genres || e.tags || []) {
      const k = String(g).toLowerCase();
      dims[k] = (dims[k] || 0) + w;
    }
  }

  for (const ev of recentEvents(days)) {
    if (ev.weight <= 0 || !ev.animeId) continue;
    const entry = entries.find((x) => x.id === ev.animeId);
    if (!entry) continue;
    for (const g of entry.genres || entry.tags || []) {
      const k = String(g).toLowerCase();
      dims[k] = (dims[k] || 0) + Math.abs(ev.weight) * 0.25;
    }
  }

  const max = Math.max(...Object.values(dims), 1);
  for (const k of Object.keys(dims)) dims[k] /= max;
  return dims;
}

export function buildWindowProfiles(
  entries: WatchlistEntry[],
): WindowProfile[] {
  return [
    { label: "historical", days: 365 * 3, dims: windowDims(entries, 9999) },
    { label: "medium", days: 90, dims: windowDims(entries, 90) },
    { label: "recent", days: 30, dims: windowDims(entries, 30) },
  ];
}

/** Compare historical vs recent; only emit trends with enough evidence. */
export function detectTasteTrends(
  entries: WatchlistEntry[],
  minEvidence = 3,
): TasteTrend[] {
  const profiles = buildWindowProfiles(entries);
  const hist = profiles.find((p) => p.label === "historical")?.dims || {};
  const recent = profiles.find((p) => p.label === "recent")?.dims || {};
  const keys = new Set([...Object.keys(hist), ...Object.keys(recent)]);
  const trends: TasteTrend[] = [];

  for (const dim of keys) {
    const h = hist[dim] || 0;
    const r = recent[dim] || 0;
    const delta = r - h;
    if (Math.abs(delta) < 0.12) continue;

    // Approximate evidence from entry tags in last 30d
    const cut = Date.now() - 30 * 24 * 60 * 60 * 1000;
    let evidence = 0;
    for (const e of entries) {
      const u = e.updatedAt ? new Date(e.updatedAt).getTime() : 0;
      if (u && u >= cut) {
        if ((e.genres || e.tags || []).some((g) => String(g).toLowerCase() === dim))
          evidence += 1;
      }
    }
    evidence += recentEvents(30).filter((ev) => ev.weight > 0).length > 5 ? 2 : 0;

    if (evidence < minEvidence) continue;

    const strength = Math.min(1, Math.abs(delta) * 1.2);
    const confidence = Math.min(1, 0.35 + evidence * 0.08 + strength * 0.3);
    if (confidence < 0.45) continue;

    trends.push({
      dimension: dim,
      direction: delta > 0 ? "up" : "down",
      strength,
      confidence,
      evidenceCount: evidence,
    });
  }

  trends.sort((a, b) => b.confidence * b.strength - a.confidence * a.strength);
  return trends.slice(0, 8);
}

export function trendSummary(trends: TasteTrend[]): string | null {
  if (!trends.length) return null;
  const up = trends.filter((t) => t.direction === "up").slice(0, 2);
  const down = trends.filter((t) => t.direction === "down").slice(0, 2);
  const parts: string[] = [];
  if (up.length)
    parts.push(`leaning into ${up.map((t) => t.dimension).join(" & ")}`);
  if (down.length)
    parts.push(`cooling on ${down.map((t) => t.dimension).join(" & ")}`);
  return parts.length ? `Recent drift: ${parts.join("; ")}.` : null;
}
