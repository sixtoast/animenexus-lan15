"use client";

import { useEffect, useState } from "react";
import { playCue } from "@/lib/sound-engine";

const NOTES_KEY = "anime_nexus_notes";

type NotesMap = Record<string, string>;

function readAll(): NotesMap {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(NOTES_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as NotesMap;
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function writeAll(map: NotesMap) {
  localStorage.setItem(NOTES_KEY, JSON.stringify(map));
}

type Props = { animeId: number };

export function AnimeNotes({ animeId }: Props) {
  const key = String(animeId);
  const [text, setText] = useState("");
  const [ready, setReady] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const all = readAll();
    setText(all[key] || "");
    setReady(true);
  }, [key]);

  function save() {
    const all = readAll();
    if (text.trim()) all[key] = text;
    else delete all[key];
    writeAll(all);
    setSaved(true);
    playCue("success");
    window.setTimeout(() => setSaved(false), 1400);
  }

  if (!ready) {
    return (
      <div className="notes-box">
        <h3 className="binge-title">Journal</h3>
        <p className="binge-meta">Loading…</p>
      </div>
    );
  }

  return (
    <div className={"notes-box" + (saved ? " notes-box--saved" : "")}>
      <h3 className="binge-title">Journal</h3>
      <p className="binge-meta">
        Private notes for this title · stored as <code>anime_nexus_notes</code>
      </p>
      <textarea
        className="notes-area"
        rows={5}
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Thoughts, episode reactions, mood diary…"
      />
      <button type="button" className="btn btn-accent btn-sm" onClick={save}>
        {saved ? "Ink set ✓" : "Save notes"}
      </button>
      {saved ? (
        <p className="notes-confirm" role="status">
          Saved on this device.
        </p>
      ) : null}
    </div>
  );
}
