"use client";

import { useEffect, useState } from "react";

type Row = {
  id: string;
  label: string;
  configured: boolean;
  notes?: string;
  group?: string;
};

const GROUP_LABEL: Record<string, string> = {
  catalog: "Catalog",
  enrichment: "Enrichment",
  availability: "Availability",
  notify: "Notifications",
  infra: "Infrastructure",
};

export function ProviderStatusPanel() {
  const [rows, setRows] = useState<Row[] | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    void fetch("/api/provider-status")
      .then((r) => r.json())
      .then((j) => {
        if (Array.isArray(j.providers)) setRows(j.providers);
        else setErr("Unexpected response");
      })
      .catch(() => setErr("Could not load provider status"));
  }, []);

  if (err) {
    return <p className="tools-hint">{err}</p>;
  }

  if (!rows) {
    return <p className="tools-hint">Loading provider gates…</p>;
  }

  const groups = [...new Set(rows.map((r) => r.group || "other"))];

  return (
    <div>
      <p className="tools-hint" style={{ marginBottom: 14 }}>
        Boolean config only — secrets are never shown. Missing keys soft-fail;
        the site stays usable on AniList alone.
      </p>
      {groups.map((g) => {
        const subset = rows.filter((r) => (r.group || "other") === g);
        if (!subset.length) return null;
        return (
          <div key={g} style={{ marginBottom: 18 }}>
            <h3 className="nx-kicker" style={{ marginBottom: 8 }}>
              {GROUP_LABEL[g] || g}
            </h3>
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
                  <span
                    style={{
                      fontWeight: 600,
                      minWidth: 120,
                    }}
                  >
                    {r.label}
                  </span>
                  <span
                    className="detail-tag"
                    style={{
                      cursor: "default",
                      opacity: r.configured ? 1 : 0.65,
                    }}
                  >
                    {r.configured ? "configured" : "optional / off"}
                  </span>
                  {r.notes ? (
                    <span className="tools-hint">{r.notes}</span>
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
