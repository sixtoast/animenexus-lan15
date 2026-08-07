"use client";

import { useState } from "react";
import { useWatchlist } from "@/components/WatchlistProvider";
import { isAIConfigured } from "@/lib/ai-settings";
import {
  runAIColdOpen,
  runAIFitCheck,
  runAIWatchOrder,
} from "@/lib/oracle-cloud";
import { useToast } from "@/components/ToastProvider";

type Props = {
  title: string;
  synopsis: string;
  genres: string[];
  relationsSummary: string;
};

export function DetailAI({
  title,
  synopsis,
  genres,
  relationsSummary,
}: Props) {
  const { entries } = useWatchlist();
  const { showToast } = useToast();
  const [out, setOut] = useState<{ kind: string; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  async function run(kind: "cold" | "order" | "fit") {
    if (!isAIConfigured()) {
      showToast("Add an API key in the AI panel first", "🤖");
      return;
    }
    setBusy(true);
    setOut(null);
    try {
      let text = "";
      if (kind === "cold") text = await runAIColdOpen(title, synopsis);
      else if (kind === "order")
        text = await runAIWatchOrder(title, relationsSummary);
      else {
        const digest = entries
          .slice(0, 30)
          .map(
            (e) =>
              `${e.title} [${e.watchStatus}]` +
              (e.genres?.length ? ` ${e.genres.slice(0, 3).join("/")}` : ""),
          )
          .join("\n");
        text = await runAIFitCheck(title, genres, digest);
      }
      setOut({
        kind:
          kind === "cold"
            ? "Cold open"
            : kind === "order"
              ? "Watch order"
              : "Fit check",
        text,
      });
    } catch (e) {
      showToast(e instanceof Error ? e.message : "AI failed", "😅");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="detail-section">
      <h2>AI tools</h2>
      <div className="daily-actions">
        <button
          type="button"
          className="btn btn-outline btn-sm"
          disabled={busy}
          onClick={() => run("cold")}
        >
          Cold open
        </button>
        <button
          type="button"
          className="btn btn-outline btn-sm"
          disabled={busy}
          onClick={() => run("order")}
        >
          Watch order
        </button>
        <button
          type="button"
          className="btn btn-outline btn-sm"
          disabled={busy}
          onClick={() => run("fit")}
        >
          Fit check
        </button>
      </div>
      {busy ? <p className="taste-footnote">Generating…</p> : null}
      {out ? (
        <div className="binge-box" style={{ marginTop: 12 }}>
          <h3 className="binge-title">{out.kind}</h3>
          <p className="binge-result" style={{ whiteSpace: "pre-wrap" }}>
            {out.text}
          </p>
        </div>
      ) : null}
    </section>
  );
}
