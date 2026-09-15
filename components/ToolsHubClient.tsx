"use client";

import Link from "next/link";
import { NexusIcon } from "@/components/ui/NexusIcon";
import type { NexusIconName } from "@/lib/icons/registry";
import { toolPersonality, type ToolPersonalityId } from "@/lib/tool-personality";

export type ToolCard = {
  href: string;
  icon: NexusIconName;
  title: string;
  blurb: string;
  personality: ToolPersonalityId;
  group?: ToolGroupId;
};

export type ToolGroupId =
  | "discover"
  | "understand"
  | "manage"
  | "monitor"
  | "studio";

const GROUP_META: Record<
  ToolGroupId,
  { label: string; purpose: string }
> = {
  discover: { label: "Discover", purpose: "Find the next signal." },
  understand: {
    label: "Understand",
    purpose: "Anime and your relationship with it.",
  },
  manage: { label: "Manage", purpose: "Keep the shelf useful." },
  monitor: { label: "Monitor", purpose: "Watch what is changing." },
  studio: { label: "Studio", purpose: "Play, trace, and make." },
};

const GROUP_ORDER: ToolGroupId[] = [
  "discover",
  "understand",
  "manage",
  "monitor",
  "studio",
];

function groupFor(t: ToolCard): ToolGroupId {
  if (t.group) return t.group;
  const h = t.href;
  if (
    h.includes("tonight") ||
    h.includes("fusion") ||
    h.includes("dislike") ||
    h.includes("oracle")
  )
    return "discover";
  if (h.includes("compare") || h.includes("stats") || h.includes("fanzone"))
    return "understand";
  if (h.includes("completionist") || h.includes("session-cover"))
    return "manage";
  if (
    h.includes("radar") ||
    h.includes("signals") ||
    h.includes("status") ||
    h.includes("airing")
  )
    return "monitor";
  return "studio";
}

export function ToolsHubClient({ tools }: { tools: ToolCard[] }) {
  const buckets = new Map<ToolGroupId, ToolCard[]>();
  for (const id of GROUP_ORDER) buckets.set(id, []);
  for (const t of tools) {
    const g = groupFor(t);
    buckets.get(g)!.push(t);
  }

  return (
    <div className="tools-cabinet">
      {GROUP_ORDER.map((gid) => {
        const list = buckets.get(gid) || [];
        if (!list.length) return null;
        const meta = GROUP_META[gid];
        return (
          <section
            key={gid}
            className={`tools-group tools-group--${gid}`}
            aria-labelledby={`tools-group-${gid}`}
          >
            <header className="tools-group-head">
              <h2 id={`tools-group-${gid}`} className="tools-group-label">
                {meta.label}
              </h2>
              <p className="tools-group-purpose">{meta.purpose}</p>
            </header>
            <ul className="tools-group-instruments">
              {list.map((t) => {
                const p = toolPersonality(t.personality);
                const grammar =
                  t.personality === "fusion"
                    ? "tools-instrument--fusion"
                    : t.personality === "dislike"
                      ? "tools-instrument--reverse"
                      : t.personality === "radar"
                        ? "tools-instrument--radar"
                        : "";
                return (
                  <li key={t.href}>
                    <Link
                      href={t.href}
                      className={`tools-instrument ${grammar}`.trim()}
                    >
                      <span className="tools-instrument-icon" aria-hidden>
                        <NexusIcon name={t.icon} size="md" />
                      </span>
                      <span className="tools-instrument-body">
                        <span className="tools-instrument-title">{t.title}</span>
                        <span className="tools-instrument-blurb">{t.blurb}</span>
                        <span className="tools-instrument-role">{p.role}</span>
                      </span>
                      {t.personality === "fusion" ? (
                        <span className="tools-fusion-marks" aria-hidden>
                          <span className="tools-fusion-a" />
                          <span className="tools-fusion-x" />
                          <span className="tools-fusion-b" />
                        </span>
                      ) : null}
                      {t.personality === "dislike" ? (
                        <span className="tools-reverse-rule" aria-hidden />
                      ) : null}
                      {t.personality === "radar" ? (
                        <span className="tools-radar-ticks" aria-hidden />
                      ) : null}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </section>
        );
      })}
    </div>
  );
}

export function OpenAiDeskButton() {
  return (
    <button
      type="button"
      className="btn btn-accent tools-ai-open"
      onClick={() => window.dispatchEvent(new Event("lantern:open-ai"))}
    >
      <NexusIcon name="lantern" size="md" />
      <span>Lantern AI desk</span>
    </button>
  );
}
