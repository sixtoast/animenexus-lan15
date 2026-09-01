"use client";

import { useState } from "react";
import { playCue } from "@/lib/sound-engine";

type Props = {
  title: string;
  animeId: number;
  /** Optional desk-note style blurb */
  note?: string;
};

/** Native share / clipboard for a title desk card. */
export function ShareTitleButton({ title, animeId, note }: Props) {
  const [msg, setMsg] = useState<string | null>(null);

  async function share() {
    const url =
      typeof window !== "undefined"
        ? `${window.location.origin}/anime/${animeId}`
        : `/anime/${animeId}`;
    const text = note
      ? `${title} — ${note}\n${url}`
      : `${title}\n${url}`;

    try {
      if (typeof navigator !== "undefined" && navigator.share) {
        await navigator.share({ title, text, url });
        playCue("success");
        setMsg("Shared");
      } else if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
        playCue("success");
        setMsg("Link copied");
      } else {
        setMsg("Share unavailable");
      }
    } catch {
      /* user cancelled or failed */
      try {
        await navigator.clipboard.writeText(url);
        setMsg("Link copied");
        playCue("success");
      } catch {
        setMsg("Could not share");
      }
    }
    window.setTimeout(() => setMsg(null), 1800);
  }

  return (
    <span className="share-title-wrap">
      <button
        type="button"
        className="btn btn-outline btn-sm share-title-btn"
        onClick={() => void share()}
      >
        Share
      </button>
      {msg ? (
        <span className="meta" role="status" style={{ marginLeft: 8 }}>
          {msg}
        </span>
      ) : null}
    </span>
  );
}
