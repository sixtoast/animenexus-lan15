"use client";

import { useEffect, useState } from "react";
import { playCue } from "@/lib/sound-engine";
import { readDeskNote, writeDeskNote } from "@/lib/desk-notes";

type Props = {
  animeId: number;
  title: string;
};

/** One-line editorial note for the desk — feeds soft ranking reasons. */
export function DeskNoteEditor({ animeId, title }: Props) {
  const [text, setText] = useState("");
  const [ready, setReady] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const n = readDeskNote(animeId);
    setText(n?.note || "");
    setReady(true);
  }, [animeId]);

  function save() {
    writeDeskNote(animeId, title, text);
    setSaved(true);
    playCue("success");
    window.setTimeout(() => setSaved(false), 1600);
  }

  if (!ready) return null;

  return (
    <section className="detail-section desk-note-editor">
      <h2>Desk note</h2>
      <p className="tools-hint" style={{ marginBottom: 8 }}>
        One line for the lantern — why this title is on your desk. Local only;
        soft-boosts ranking when present.
      </p>
      <textarea
        className="filter-input"
        rows={2}
        maxLength={280}
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="e.g. Save for a quiet weekend · strong OP"
        aria-label="Desk note"
      />
      <div style={{ marginTop: 8, display: "flex", gap: 8, alignItems: "center" }}>
        <button type="button" className="btn btn-accent btn-sm" onClick={save}>
          Save note
        </button>
        {saved ? <span className="meta">Saved</span> : null}
      </div>
    </section>
  );
}
