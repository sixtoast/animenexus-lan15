"use client";

/**
 * Personalised home airing module (Multi-API Sprint 12).
 * Only watching/planning shelf — not a generic seasonal schedule.
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useWatchlist } from "@/components/WatchlistProvider";
import {
  formatAirTime,
  groupContactsByWindow,
  type RadarContact,
  type TimeWindow,
} from "@/lib/radar-schedule";

const BAND = { raw: "RAW", sub: "SUB", dub: "DUB" } as const;
const WINDOW_LABEL: Partial<Record<TimeWindow, string>> = {
  today: "Today",
  tomorrow: "Tomorrow",
  week: "This week",
};

export function HomeSignalsToday() {
  const { entries, ready } = useWatchlist();
  const [contacts, setContacts] = useState<RadarContact[]>([]);
  const [note, setNote] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const shelfItems = useMemo(
    () =>
      entries
        .filter(
          (e) =>
            e.watchStatus === "watching" || e.watchStatus === "planning",
        )
        .slice(0, 12)
        .map((e) => ({ id: e.id, title: e.title, image: e.image })),
    [entries],
  );

  const load = useCallback(async () => {
    if (!shelfItems.length) {
      setContacts([]);
      setNote(null);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/radar-schedule", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items: shelfItems }),
      });
      const j = await res.json();
      const list = (j.contacts || []) as RadarContact[];
      // Home focuses on near-term only
      const near = list.filter(
        (c) =>
          c.window === "today" ||
          c.window === "tomorrow" ||
          c.window === "week",
      );
      setContacts(near);
      if (!j.configured) {
        setNote(
          "Air times need ANIMESCHEDULE_API_KEY — shelf is still yours locally.",
        );
      } else if (!near.length) {
        setNote("No airing signals for your shelf in the next week.");
      } else {
        setNote(null);
      }
    } catch {
      setContacts([]);
      setNote("Couldn’t load air signals right now.");
    } finally {
      setLoading(false);
    }
  }, [shelfItems]);

  useEffect(() => {
    if (!ready) return;
    void load();
  }, [ready, load]);

  const grouped = useMemo(() => groupContactsByWindow(contacts), [contacts]);

  if (!ready) return null;
  if (!shelfItems.length) return null;

  return (
    <section className="home-rail-section home-air-signals">
      <div className="home-rail-head">
        <h2>Your signals today</h2>
        <Link href="/tools/radar">Radar →</Link>
      </div>
      {loading ? (
        <p className="tools-hint">Tuning shelf frequencies…</p>
      ) : null}
      {note ? <p className="tools-hint">{note}</p> : null}
      {(["today", "tomorrow", "week"] as TimeWindow[]).map((w) => {
        const list = grouped[w];
        if (!list?.length) return null;
        return (
          <div key={w} style={{ marginBottom: 12 }}>
            <h3
              style={{
                fontSize: "0.75rem",
                letterSpacing: "0.1em",
                textTransform: "uppercase",
                color: "var(--color-text-muted)",
                marginBottom: 6,
              }}
            >
              {WINDOW_LABEL[w]}
            </h3>
            <ul className="theme-ul" style={{ margin: 0 }}>
              {list.map((c) => (
                <li key={`${c.anilistId}-${c.at}`}>
                  <span style={{ color: "var(--color-accent)", fontWeight: 600 }}>
                    {formatAirTime(c.at).split(",").slice(-1)[0]?.trim() ||
                      formatAirTime(c.at)}
                  </span>
                  {" · "}
                  <Link href={`/anime/${c.anilistId}`}>
                    <strong>{c.title}</strong>
                  </Link>
                  {c.episode != null ? ` · Episode ${c.episode}` : null}
                  {" · "}
                  <span className="detail-source">{BAND[c.band]}</span>
                </li>
              ))}
            </ul>
          </div>
        );
      })}
    </section>
  );
}
