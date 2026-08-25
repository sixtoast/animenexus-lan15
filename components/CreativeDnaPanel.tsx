"use client";

import { useState } from "react";
import type { CreativeDnaSlot } from "@/lib/creative-dna";

type CreditLine = { name: string; role: string; source: string };

type Props = {
  slots: CreativeDnaSlot[];
  fullCredits?: CreditLine[];
};

export function CreativeDnaPanel({ slots, fullCredits = [] }: Props) {
  const [open, setOpen] = useState(false);

  if (!slots.length && !fullCredits.length) return null;

  return (
    <section className="detail-section" aria-labelledby="creative-dna-heading">
      <h2 id="creative-dna-heading">Key creative DNA</h2>
      <p className="tools-hint" style={{ marginBottom: 12 }}>
        Primary roles only — not a full staff dump.
      </p>
      {slots.length > 0 ? (
        <ul className="theme-ul">
          {slots.map((s) => (
            <li key={s.role}>
              <strong>{s.label}</strong>
              {" · "}
              {s.names.join(", ")}
              <span className="tools-hint">
                {" "}
                ({s.sources.join(", ")})
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="tools-hint">No key roles resolved yet.</p>
      )}
      {fullCredits.length > 0 ? (
        <>
          <button
            type="button"
            className="btn btn-outline btn-sm"
            style={{ marginTop: 10 }}
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
          >
            {open ? "Hide full credits" : "Full credits"}
          </button>
          {open ? (
            <ul className="theme-ul" style={{ marginTop: 10 }}>
              {fullCredits.slice(0, 40).map((c, i) => (
                <li key={`${c.name}-${c.role}-${i}`}>
                  <strong>{c.name}</strong> · {c.role}
                  <span className="tools-hint"> · {c.source}</span>
                </li>
              ))}
            </ul>
          ) : null}
        </>
      ) : null}
    </section>
  );
}
