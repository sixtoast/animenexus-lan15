"use client";

import { useState } from "react";
import { useWatchlist } from "@/components/WatchlistProvider";
import { useToast } from "@/components/ToastProvider";
import {
  buildTasteDNA,
  compareSoulmates,
  computeBadges,
  genreHeatmap,
  parseTasteDNA,
} from "@/lib/taste";

export function TasteExtras() {
  const { entries, ready } = useWatchlist();
  const { showToast } = useToast();
  const [dnaIn, setDnaIn] = useState("");
  const [compareOut, setCompareOut] = useState<string | null>(null);

  if (!ready || entries.length === 0) return null;

  const heat = genreHeatmap(entries);
  const maxH = Math.max(...heat.map((h) => h.count), 1);
  const badges = computeBadges(entries);

  return (
    <>
      {heat.length > 0 ? (
        <section className="taste-section">
          <h2>Genre heatmap</h2>
          <div className="heatmap-grid">
            {heat.slice(0, 24).map((h) => {
              const intensity = 0.25 + (h.count / maxH) * 0.75;
              return (
                <div
                  key={h.genre}
                  className="heatmap-cell"
                  style={{
                    borderColor: `rgba(240, 160, 144, ${intensity})`,
                    background: `rgba(240, 160, 144, ${intensity * 0.2})`,
                  }}
                  title={`${h.genre}: ${h.count}`}
                >
                  <div className="count">{h.count}</div>
                  <div className="genre-name">{h.genre}</div>
                </div>
              );
            })}
          </div>
        </section>
      ) : (
        <section className="taste-section">
          <h2>Genre heatmap</h2>
          <p className="taste-footnote">
            Add titles from the catalog so genre tags attach to list entries.
          </p>
        </section>
      )}

      <section className="taste-section">
        <h2>Badges</h2>
        <div className="badge-grid">
          {badges.map((b) => (
            <div
              key={b.id}
              className={"badge-item " + (b.unlocked ? "unlocked" : "locked")}
              title={b.hint}
            >
              <span>{b.emoji}</span> {b.label}
            </div>
          ))}
        </div>
      </section>

      <section className="taste-section">
        <h2>Taste DNA</h2>
        <div className="daily-actions" style={{ marginBottom: 12 }}>
          <button
            type="button"
            className="btn btn-accent btn-sm"
            onClick={async () => {
              const code = buildTasteDNA(entries);
              try {
                await navigator.clipboard.writeText(code);
                showToast("Taste DNA copied", "🧬");
              } catch {
                prompt("Copy your Taste DNA:", code);
              }
            }}
          >
            Copy my DNA
          </button>
        </div>
        <label className="filter-label" htmlFor="dna-in">
          Friend&apos;s code
        </label>
        <input
          id="dna-in"
          className="filter-input"
          style={{ maxWidth: "100%", marginTop: 6, marginBottom: 8 }}
          value={dnaIn}
          onChange={(e) => setDnaIn(e.target.value)}
          placeholder="ANX1...."
        />
        <button
          type="button"
          className="btn btn-outline btn-sm"
          onClick={() => {
            const other = parseTasteDNA(dnaIn);
            if (!other) {
              setCompareOut("Invalid code.");
              return;
            }
            const r = compareSoulmates(entries, other);
            let label = "Distant stars";
            if (r.pct >= 75) label = "Anime soulmates";
            else if (r.pct >= 50) label = "Strong resonance";
            else if (r.pct >= 30) label = "Some overlap";
            setCompareOut(
              `${r.pct}% match — ${label}` +
                (r.shared.length ? ` · Shared: ${r.shared.join(", ")}` : ""),
            );
            showToast(`${r.pct}% soulmate match`, "💞");
          }}
        >
          Compare
        </button>
        {compareOut ? (
          <p style={{ marginTop: 12, fontWeight: 600 }}>{compareOut}</p>
        ) : null}
      </section>
    </>
  );
}
