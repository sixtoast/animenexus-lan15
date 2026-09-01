"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { listDeskNotes, type DeskNote } from "@/lib/desk-notes";

/** Recent editorial desk notes on the home rail. */
export function DeskNotesStrip() {
  const [notes, setNotes] = useState<DeskNote[]>([]);

  useEffect(() => {
    setNotes(listDeskNotes(8));
  }, []);

  if (!notes.length) return null;

  return (
    <div className="desk-notes-strip">
      <div className="home-rail-head">
        <h2 style={{ fontSize: "1.05rem", margin: 0 }}>Your desk notes</h2>
        <span className="home-rail-note">Local journal</span>
      </div>
      <ul className="desk-notes-list">
        {notes.map((n) => (
          <li key={n.animeId}>
            <Link href={`/anime/${n.animeId}`}>{n.title}</Link>
            <span className="tools-hint"> — {n.note}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
