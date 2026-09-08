"use client";

import { useCallback, useEffect, useState } from "react";

type ConfigRow = {
  id: string;
  label: string;
  configured: boolean;
  notes?: string;
  group?: string;
};

type LiveRow = {
  id: string;
  label: string;
  status: "online" | "degraded" | "down" | "skipped";
  latencyMs: number | null;
  detail?: string;
  group?: string;
};

const GROUP_LABEL: Record<string, string> = {
  catalog: "Catalog",
  enrichment: "Enrichment",
  availability: "Availability",
  notify: "Notifications",
  infra: "Infrastructure",
};

const STATUS_LABEL: Record<LiveRow["status"], string> = {
  online: "Online",
  degraded: "Slow",
  down: "Down",
  skipped: "Skipped",
};

const REFRESH_MS = 45_000;

export function ProviderStatusPanel() {
  const [rows, setRows] = useState<ConfigRow[] | null>(null);
  const [live, setLive] = useState<LiveRow[] | null>(null);
  const [checkedAt, setCheckedAt] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [loadingLive, setLoadingLive] = useState(false);

  const load = useCallback(async (withLive: boolean) => {
    if (withLive) setLoadingLive(true);
    try {
      const url = withLive
        ? "/api/provider-status?live=1"
        : "/api/provider-status";
      const r = await fetch(url, { cache: "no-store" });
      const j = await r.json();
      if (Array.isArray(j.providers)) setRows(j.providers);
      else setErr("Unexpected response");
      if (Array.isArray(j.live)) {
        setLive(j.live);
        setCheckedAt(j.checkedAt || new Date().toISOString());
      }
      setErr(null);
    } catch {
      setErr("Could not load provider status");
    } finally {
      setLoadingLive(false);
    }
  }, []);

  useEffect(() => {
    void load(true);
    const id = window.setInterval(() => void load(true), REFRESH_MS);
    return () => window.clearInterval(id);
  }, [load]);

  if (err && !rows) {
    return <p className="tools-hint">{err}</p>;
  }

  if (!rows) {
    return <p className="tools-hint">Loading provider status…</p>;
  }

  const groups = [...new Set(rows.map((r) => r.group || "other"))];

  const onlineCount = live?.filter((l) => l.status === "online").length ?? 0;
  const downCount = live?.filter((l) => l.status === "down").length ?? 0;
  const slowCount = live?.filter((l) => l.status === "degraded").length ?? 0;

  return (
    <div className="provider-status-panel">
      <div className="provider-live-block" style={{ marginBottom: 28 }}>
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: 12,
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 12,
          }}
        >
          <div>
            <h3 className="nx-kicker" style={{ marginBottom: 4 }}>
              Live API health
            </h3>
            <p className="tools-hint" style={{ margin: 0 }}>
              Auto-checks every {REFRESH_MS / 1000}s ·{" "}
              {checkedAt
                ? `last ${new Date(checkedAt).toLocaleTimeString()}`
                : "pending"}
              {live
                ? ` · ${onlineCount} online${slowCount ? ` · ${slowCount} slow` : ""}${downCount ? ` · ${downCount} down` : ""}`
                : ""}
            </p>
          </div>
          <button
            type="button"
            className="btn btn-outline btn-sm"
            disabled={loadingLive}
            onClick={() => void load(true)}
          >
            {loadingLive ? "Checking…" : "Refresh now"}
          </button>
        </div>

        {!live ? (
          <p className="tools-hint">Probing APIs…</p>
        ) : (
          <ul
            className="provider-live-list"
            style={{ listStyle: "none", padding: 0, margin: 0 }}
          >
            {live.map((l) => (
              <li
                key={l.id}
                style={{
                  display: "flex",
                  flexWrap: "wrap",
                  gap: 10,
                  alignItems: "center",
                  padding: "10px 0",
                  borderBottom:
                    "1px solid var(--color-border, rgba(128,128,128,0.2))",
                }}
              >
                <span
                  aria-hidden
                  style={{
                    width: 10,
                    height: 10,
                    borderRadius: "50%",
                    background:
                      l.status === "online"
                        ? "#7dcea0"
                        : l.status === "degraded"
                          ? "#c9a227"
                          : l.status === "down"
                            ? "#e07070"
                            : "#6a625c",
                    boxShadow:
                      l.status === "online"
                        ? "0 0 10px #7dcea0"
                        : l.status === "down"
                          ? "0 0 10px #e07070"
                          : undefined,
                    flexShrink: 0,
                  }}
                />
                <span style={{ fontWeight: 600, minWidth: 140 }}>
                  {l.label}
                </span>
                <span
                  className="detail-tag"
                  style={{
                    cursor: "default",
                    background:
                      l.status === "online"
                        ? "rgba(125,206,160,0.15)"
                        : l.status === "degraded"
                          ? "rgba(201,162,39,0.15)"
                          : l.status === "down"
                            ? "rgba(224,112,112,0.15)"
                            : "rgba(128,128,128,0.12)",
                  }}
                >
                  {STATUS_LABEL[l.status]}
                </span>
                {l.detail ? (
                  <span className="meta" style={{ fontSize: "0.85rem" }}>
                    {l.detail}
                  </span>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </div>

      <h3 className="nx-kicker" style={{ marginBottom: 8 }}>
        Configuration gates
      </h3>
      <p className="tools-hint" style={{ marginBottom: 14 }}>
        Whether optional keys are set (secrets never shown). Missing keys
        soft-fail — the site stays usable on AniList alone.
      </p>
      {groups.map((g) => {
        const subset = rows.filter((r) => (r.group || "other") === g);
        if (!subset.length) return null;
        return (
          <div key={g} style={{ marginBottom: 18 }}>
            <h4
              className="nx-kicker"
              style={{ marginBottom: 8, opacity: 0.85 }}
            >
              {GROUP_LABEL[g] || g}
            </h4>
            <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
              {subset.map((r) => (
                <li
                  key={r.id}
                  style={{
                    display: "flex",
                    flexWrap: "wrap",
                    gap: 8,
                    alignItems: "baseline",
                    padding: "8px 0",
                    borderBottom:
                      "1px solid var(--color-border, rgba(128,128,128,0.2))",
                  }}
                >
                  <span style={{ fontWeight: 600, minWidth: 120 }}>
                    {r.label}
                  </span>
                  <span
                    className="detail-tag"
                    style={{
                      cursor: "default",
                      opacity: r.configured ? 1 : 0.7,
                    }}
                  >
                    {r.configured ? "Configured" : "Not set"}
                  </span>
                  {r.notes ? (
                    <span className="meta" style={{ fontSize: "0.85rem" }}>
                      {r.notes}
                    </span>
                  ) : null}
                </li>
              ))}
            </ul>
          </div>
        );
      })}
    </div>
  );
}
