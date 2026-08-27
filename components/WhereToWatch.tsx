"use client";

import { useEffect, useState } from "react";
import {
  partitionByMyServices,
  readMyServices,
  type StreamingServiceId,
} from "@/lib/my-services";
import type { StreamingAvailability } from "@/lib/providers/watchmode";
import { recordAvailabilityCheck } from "@/lib/availability-changes";

type Props = {
  animeId: number;
  title: string;
};

type ApiPayload = {
  configured?: boolean;
  country?: string;
  availability?: StreamingAvailability[];
  stream?: StreamingAvailability[];
  rentOrBuy?: StreamingAvailability[];
  message?: string;
  error?: string;
};

function typeLabel(t: StreamingAvailability["type"]): string {
  switch (t) {
    case "subscription":
      return "Sub";
    case "free":
      return "Free";
    case "ads":
      return "Ads";
    case "rent":
      return "Rent";
    case "buy":
      return "Buy";
    default:
      return t;
  }
}

function SourceList({ rows }: { rows: StreamingAvailability[] }) {
  if (!rows.length) return null;
  return (
    <ul className="theme-ul">
      {rows.map((r) => (
        <li key={`${r.provider}-${r.type}-${r.country}`}>
          <strong>{r.provider}</strong>
          <span className="tools-hint">
            {" "}
            · {typeLabel(r.type)}
            {r.format ? ` · ${r.format}` : ""}
          </span>
          {r.webUrl ? (
            <>
              {" "}
              <a href={r.webUrl} target="_blank" rel="noreferrer">
                Open ↗
              </a>
            </>
          ) : null}
        </li>
      ))}
    </ul>
  );
}

export function WhereToWatch({ animeId, title }: Props) {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<ApiPayload | null>(null);
  const [mine, setMine] = useState<StreamingAvailability[]>([]);
  const [other, setOther] = useState<StreamingAvailability[]>([]);
  const [region, setRegion] = useState("US");
  const [selected, setSelected] = useState<StreamingServiceId[]>([]);
  const [freshNotes, setFreshNotes] = useState<string[]>([]);

  useEffect(() => {
    const prefs = readMyServices();
    setRegion(prefs.region);
    setSelected(prefs.services);

    let cancelled = false;
    setLoading(true);
    const q = new URLSearchParams({
      id: String(animeId),
      region: prefs.region,
      title,
    });
    fetch(`/api/streaming?${q}`)
      .then((r) => r.json())
      .then((j: ApiPayload) => {
        if (cancelled) return;
        setData(j);
        const rows = j.availability || [];
        const split = partitionByMyServices(rows, prefs.services);
        setMine(split.mine);
        setOther(split.other);
        if (j.configured && j.country) {
          const signals = recordAvailabilityCheck({
            id: animeId,
            title,
            country: j.country,
            availability: rows,
          });
          if (signals.length) {
            setFreshNotes(
              signals.map((s) =>
                s.kind === "added"
                  ? `Now listed on ${s.provider}`
                  : `No longer listed on ${s.provider}`,
              ),
            );
          }
        }
      })
      .catch(() => {
        if (!cancelled) setData({ configured: false, availability: [] });
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [animeId, title]);

  if (loading) {
    return (
      <section className="detail-section" aria-labelledby="watch-heading">
        <h2 id="watch-heading">Watch</h2>
        <p className="tools-hint">Checking availability…</p>
      </section>
    );
  }

  if (!data?.configured) {
    return (
      <section className="detail-section" aria-labelledby="watch-heading">
        <h2 id="watch-heading">Watch</h2>
        <p className="tools-hint">
          Streaming lookup is offline (no Watchmode key). Catalog still works.
        </p>
      </section>
    );
  }

  const rows = data.availability || [];
  const country = data.country || region;

  return (
    <section className="detail-section" aria-labelledby="watch-heading">
      <h2 id="watch-heading">Watch</h2>
      <p className="tools-hint" style={{ marginBottom: 12 }}>
        Region <strong>{country}</strong>
        {selected.length
          ? ` · ${selected.length} service(s) on your list`
          : " · set My services on Account for “available to me”"}
        . Listing ≠ subscription ownership.
      </p>

      {freshNotes.length > 0 ? (
        <p className="tools-hint" style={{ marginBottom: 10, color: "var(--color-accent)" }}>
          Change since last visit: {freshNotes.join(" · ")}
        </p>
      ) : null}

      {data.error ? (
        <p className="tools-hint">{data.error}</p>
      ) : null}

      {!rows.length ? (
        <p className="tools-hint">
          No streaming sources found for this title in {country}.
        </p>
      ) : (
        <>
          {selected.length > 0 ? (
            <>
              <h3 className="theme-sub">Available on your services</h3>
              {mine.length ? (
                <SourceList rows={mine} />
              ) : (
                <p className="tools-hint" style={{ marginBottom: 12 }}>
                  Not listed on your selected services in {country}.
                </p>
              )}
              {other.length > 0 ? (
                <>
                  <h3 className="theme-sub" style={{ marginTop: 14 }}>
                    Also available
                  </h3>
                  <SourceList rows={other} />
                </>
              ) : null}
            </>
          ) : (
            <>
              <h3 className="theme-sub">Available</h3>
              <SourceList rows={rows} />
            </>
          )}
        </>
      )}
    </section>
  );
}
