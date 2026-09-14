"use client";

import Link from "next/link";
import { useCallback, useMemo, useState } from "react";

export type AiringScheduleItem = {
  airingAt: number;
  episode: number;
  media: { id: number; title: string; image?: string };
};

export type AiringDayGroup = {
  key: string;
  heading: string;
  items: AiringScheduleItem[];
};

type Props = {
  groups: AiringDayGroup[];
  /** Day keys open by default (e.g. today + tomorrow). */
  defaultOpenKeys?: string[];
};

export function AiringScheduleGroups({ groups, defaultOpenKeys }: Props) {
  const initial = useMemo(() => {
    const set = new Set(defaultOpenKeys || []);
    if (set.size === 0 && groups[0]) set.add(groups[0].key);
    return set;
  }, [defaultOpenKeys, groups]);

  const [open, setOpen] = useState<Set<string>>(initial);

  const toggle = useCallback((key: string) => {
    setOpen((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }, []);

  const expandAll = useCallback(() => {
    setOpen(new Set(groups.map((g) => g.key)));
  }, [groups]);

  const collapseAll = useCallback(() => {
    setOpen(new Set());
  }, []);

  if (groups.length === 0) {
    return <p className="tools-hint">Schedule quiet or unreachable.</p>;
  }

  return (
    <div className="airing-day-groups">
      <div className="airing-day-toolbar">
        <span className="airing-day-count">
          {groups.length} day{groups.length === 1 ? "" : "s"}
        </span>
        <div className="airing-day-toolbar-actions">
          <button type="button" className="airing-day-btn" onClick={expandAll}>
            Expand all
          </button>
          <button type="button" className="airing-day-btn" onClick={collapseAll}>
            Collapse all
          </button>
        </div>
      </div>

      {groups.map((group) => {
        const isOpen = open.has(group.key);
        const panelId = `airing-day-${group.key}`;
        return (
          <section
            key={group.key}
            className={`airing-day-group${isOpen ? " is-open" : ""}`}
          >
            <button
              type="button"
              className="airing-day-heading"
              aria-expanded={isOpen}
              aria-controls={panelId}
              onClick={() => toggle(group.key)}
            >
              <span
                className={`airing-day-chevron${isOpen ? " is-open" : ""}`}
                aria-hidden
              />
              <span className="airing-day-heading-text">{group.heading}</span>
              <span className="airing-day-badge">
                {group.items.length} ep{group.items.length === 1 ? "" : "s"}
              </span>
            </button>

            {isOpen ? (
              <ul id={panelId} className="airing-schedule">
                {group.items.map((row) => (
                  <li key={`${row.media.id}-${row.episode}-${row.airingAt}`}>
                    <Link
                      href={`/anime/${row.media.id}`}
                      className="airing-row"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={row.media.image || ""} alt="" />
                      <div className="airing-row-body">
                        <div className="airing-title">{row.media.title}</div>
                        <div className="airing-meta">Ep {row.episode}</div>
                      </div>
                      <time
                        className="airing-time"
                        dateTime={new Date(row.airingAt * 1000).toISOString()}
                      >
                        {formatTimeOnly(row.airingAt)}
                      </time>
                    </Link>
                  </li>
                ))}
              </ul>
            ) : null}
          </section>
        );
      })}
    </div>
  );
}

function formatTimeOnly(tsSec: number): string {
  try {
    return new Date(tsSec * 1000).toLocaleTimeString(undefined, {
      hour: "numeric",
      minute: "2-digit",
    });
  } catch {
    return "";
  }
}
