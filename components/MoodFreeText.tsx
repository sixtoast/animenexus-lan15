"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { isAIConfigured } from "@/lib/ai-settings";
import {
  interpretViewingIntent,
  structuredToExperienceIntent,
  type StructuredViewingIntent,
} from "@/lib/intelligence/ai/interpret-intent";
import {
  writeAiIntentOverlay,
  writeIntentSession,
} from "@/lib/intent-session";
import { useToast } from "@/components/ToastProvider";

type Props = {
  /** Optional redirect after interpret (default /mood/{slug}) */
  redirect?: boolean;
};

export function MoodFreeText({ redirect = true }: Props) {
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<StructuredViewingIntent | null>(null);
  const { showToast } = useToast();
  const router = useRouter();

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!text.trim()) {
      showToast("Describe the night you want", "✨");
      return;
    }
    if (!isAIConfigured()) {
      showToast("Add an API key in the AI panel first", "🤖");
      return;
    }
    setBusy(true);
    setResult(null);
    try {
      const structured = await interpretViewingIntent(text);
      setResult(structured);
      writeAiIntentOverlay({
        freeText: text.trim(),
        structured,
        at: Date.now(),
      });
      const exp = structuredToExperienceIntent(structured);
      writeIntentSession({
        slug: exp.slug === "custom" ? null : exp.slug,
        ...(structured.session?.intensity
          ? { intensity: structured.session.intensity }
          : {}),
        ...(structured.session?.energy
          ? { energy: structured.session.energy }
          : {}),
        ...(structured.session?.attention
          ? { attention: structured.session.attention }
          : {}),
      });
      showToast(structured.paraphrase || `Intent · ${exp.label}`, exp.emoji);
      if (redirect && exp.slug && exp.slug !== "custom") {
        router.push(`/mood/${exp.slug}`);
      }
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Intent parse failed", "😅");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mood-freetext panel" style={{ marginTop: 20 }}>
      <form onSubmit={onSubmit}>
        <label className="meta" htmlFor="mood-freetext-input">
          Or describe the night in your own words
        </label>
        <textarea
          id="mood-freetext-input"
          className="input"
          rows={3}
          placeholder='e.g. "Depressing but not hopeless — I want to get attached then have it destroy me. No pure horror."'
          value={text}
          onChange={(e) => setText(e.target.value)}
          disabled={busy}
          style={{ width: "100%", marginTop: 8, resize: "vertical" }}
        />
        <div
          style={{
            display: "flex",
            gap: 10,
            marginTop: 10,
            flexWrap: "wrap",
            alignItems: "center",
          }}
        >
          <button type="submit" className="btn btn-primary btn-sm" disabled={busy}>
            {busy ? "Reading the room…" : "Interpret with Lantern AI"}
          </button>
          <span className="meta">
            Structured intent only — still ranked by V3, not free-form chat picks
          </span>
        </div>
      </form>
      {result ? (
        <div className="mood-freetext-result" style={{ marginTop: 14 }}>
          <p style={{ margin: 0 }}>
            <strong>{result.label || result.intent}</strong>
            {result.paraphrase ? (
              <span className="meta"> · {result.paraphrase}</span>
            ) : null}
          </p>
          <p className="meta" style={{ marginTop: 6 }}>
            confidence {(result.confidence * 100).toFixed(0)}%
            {result.hardAvoid.length
              ? ` · hard avoid: ${result.hardAvoid.join(", ")}`
              : ""}
            {result.avoid.length ? ` · soft avoid: ${result.avoid.join(", ")}` : ""}
          </p>
        </div>
      ) : null}
    </div>
  );
}
