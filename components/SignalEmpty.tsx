"use client";

import Link from "next/link";
import {
  EmptyIllustration,
  type EmptyKind,
} from "@/components/rive/EmptyIllustration";

type Action =
  | { label: string; onClick: () => void }
  | { label: string; href: string };

type Props = {
  /** Soft title */
  title?: string;
  /** One-line guidance */
  body?: string;
  /** Primary action */
  action?: Action;
  /** Secondary action */
  secondary?: Action;
  className?: string;
  /** Optional icon / glyph (CSS fallback inside illustration) */
  glyph?: string;
  /** Illustration family — only shown for real empty UIs */
  kind?: EmptyKind;
};

/**
 * Intelligent empty state (master plan · Sprint 19 + Creative Sprint 9).
 * Always: human message + optional next step — never a blank void.
 * Illustration is progressive enhancement only.
 */
export function SignalEmpty({
  title = "Nothing on this frequency.",
  body = "Try a different search or open a feed.",
  action,
  secondary,
  className = "",
  glyph,
  kind = "generic",
}: Props) {
  return (
    <div
      className={"state-box signal-empty " + className}
      role="status"
      aria-live="polite"
    >
      <EmptyIllustration kind={kind} glyph={glyph} />
      <p className="signal-empty-title">{title}</p>
      {body ? <p className="signal-empty-body">{body}</p> : null}

      <div className="signal-empty-actions">
        {action ? <ActionButton action={action} primary /> : null}
        {secondary ? <ActionButton action={secondary} /> : null}
      </div>
    </div>
  );
}

function ActionButton({
  action,
  primary,
}: {
  action: Action;
  primary?: boolean;
}) {
  const cls = primary ? "btn btn-accent btn-sm" : "btn btn-outline btn-sm";
  if ("href" in action) {
    return (
      <Link href={action.href} className={cls}>
        {action.label}
      </Link>
    );
  }
  return (
    <button type="button" className={cls} onClick={action.onClick}>
      {action.label}
    </button>
  );
}
