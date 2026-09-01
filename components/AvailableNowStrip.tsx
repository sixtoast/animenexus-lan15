"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { Anime } from "@/lib/types";
import {
  probeAvailableToMe,
  type AvailabilityProbe,
} from "@/lib/available-to-me";
import { readMyServices } from "@/lib/my-services";

type Props = {
  candidates: Anime[];
};

/**
 * Soft “on your services” shelf — never hard-filters the catalog.
 * Quota-safe probe of a few titles; unknown stays neutral.
 */
export function AvailableNowStrip({ candidates }: Props) {
  const [rows, setRows] = useState<
    { anime: Anime; probe: AvailabilityProbe }[]
  >([]);
  const [ready, setReady] = useState(false);
  const [hasServices, setHasServices] = useState(false);

  useEffect(() => {
    const prefs = readMyServices();
    setHasServices(prefs.services.length > 0);
    if (!prefs.services.length || !candidates.length) {
      setReady(true);
      return;
    }
    let cancelled = false;
    const slice = candidates.slice(0, 10).map((a) => ({
      id: a.id,
      title: a.title,
    }));
    void probeAvailableToMe(slice, { limit: 8 }).then((map) => {
      if (cancelled) return;
      const hit: { anime: Anime; probe: AvailabilityProbe }[] = [];
      for (const a of candidates) {
        const p = map.get(a.id);
        if (p && p.onMyServices && !p.unknown) {
          hit.push({ anime: a, probe: p });
        }
      }
      setRows(hit.slice(0, 6));
      setReady(true);
    });
    return () => {
      cancelled = true;
    };
  }, [candidates]);

  if (!ready) return null;
  if (!hasServices) {
    return (
      <div className="available-now available-now--empty">
        <div className="home-rail-head">
          <h2 style={{ fontSize: "1.05rem", margin: 0 }}>On my services</h2>
          <span className="home-rail-note">Optional</span>
        </div>
        <p className="tools-hint">
          Set streaming services under Account / tools so Lantern can soft-rank
          what is already on your shelf of platforms. Never required.
        </p>
        <Link href="/account" className="btn btn-outline btn-sm">
          Set services
        </Link>
      </div>
    );
  }
  if (!rows.length) return null;

  return (
    <div className="available-now" aria-label="Titles available on your services">
      <div className="home-rail-head">
        <h2 style={{ fontSize: "1.05rem", margin: 0 }}>Likely on your services</h2>
        <span className="home-rail-note">Soft · Watchmode when configured</span>
      </div>
      <ul className="available-now-list">
        {rows.map(({ anime, probe }) => (
          <li key={anime.id}>
            <Link href={`/anime/${anime.id}`}>{anime.title}</Link>
            {probe.providers.length ? (
              <span className="tools-hint">
                {" "}
                · {probe.providers.slice(0, 3).join(", ")}
              </span>
            ) : null}
          </li>
        ))}
      </ul>
    </div>
  );
}
