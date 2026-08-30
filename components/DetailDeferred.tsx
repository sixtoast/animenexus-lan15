"use client";

/**
 * Progressive disclosure for heavy detail sections.
 * Above-the-fold stays server-rendered; user expands deep panels on demand.
 */

import { useState, type ReactNode } from "react";

type Props = {
  title: string;
  children: ReactNode;
  defaultOpen?: boolean;
  note?: string;
};

export function DetailDeferred({ title, children, defaultOpen = false, note }: Props) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <section className="detail-deferred">
      <button
        type="button"
        className="detail-deferred-toggle"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        <span>{title}</span>
        <span className="detail-deferred-chevron" aria-hidden>
          {open ? "−" : "+"}
        </span>
      </button>
      {note && !open ? <p className="tools-hint detail-deferred-note">{note}</p> : null}
      {open ? <div className="detail-deferred-body">{children}</div> : null}
    </section>
  );
}
