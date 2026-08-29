"use client";

import { NexusRive } from "./NexusRive";

export type EmptyKind = "generic" | "shelf" | "search" | "signals";

export type EmptyIllustrationProps = {
  kind?: EmptyKind;
  className?: string;
  /** Optional glyph when Rive missing */
  glyph?: string;
  src?: string;
};

const KIND_GLYPH: Record<EmptyKind, string> = {
  generic: "📡",
  shelf: "📭",
  search: "🔎",
  signals: "〰️",
};

/**
 * Presentation illustration for real empty states only.
 * Parent owns title/body/actions and role="status".
 */
export function EmptyIllustration({
  kind = "generic",
  className = "",
  glyph,
  src = "/rive/empty-state.riv",
}: EmptyIllustrationProps) {
  const mark = glyph ?? KIND_GLYPH[kind];

  return (
    <div
      className={`nx-empty-illust nx-empty-illust--${kind} ${className}`.trim()}
      data-empty-kind={kind}
      aria-hidden
    >
      <NexusRive
        src={src}
        stateMachines="State Machine 1"
        appState="idle"
        height={72}
        width={72}
        label={`Empty · ${kind}`}
        fallback={
          <div className="nx-empty-illust-fallback" data-kind={kind}>
            <span className="nx-empty-illust-glyph">{mark}</span>
            <span className="nx-empty-illust-ring" />
          </div>
        }
      />
    </div>
  );
}
