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
};

export function ToolsHubClient({ tools }: { tools: ToolCard[] }) {
  return (
    <div className="tools-hub">
      {tools.map((t, i) => {
        const p = toolPersonality(t.personality);
        return (
          <Link
            key={t.href}
            href={t.href}
            className="tools-hub-card"
            style={{ "--i": i } as React.CSSProperties}
          >
            <span className="tools-hub-icon" aria-hidden>
              <NexusIcon name={t.icon} size={28} />
            </span>
            <h2>{t.title}</h2>
            <p>{t.blurb}</p>
            <span className="tools-hub-role">{p.role}</span>
          </Link>
        );
      })}
    </div>
  );
}

/** Open AI desk from tools (listens globally in AIPanel). */
export function OpenAiDeskButton() {
  return (
    <button
      type="button"
      className="btn btn-accent tools-ai-open"
      onClick={() => window.dispatchEvent(new Event("lantern:open-ai"))}
    >
      <NexusIcon name="lantern" size={18} />
      <span>Lantern AI desk</span>
    </button>
  );
}
