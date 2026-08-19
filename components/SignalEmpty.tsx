"use client";

import Link from "next/link";

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
  /** Optional icon / glyph */
  glyph?: string;
};

/**
 * Intelligent empty state (master plan · Sprint 19).
 * Always: human message + optional next step — never a blank void.
 */
export function SignalEmpty({
  title = "Nothing on this frequency.",
  body = "Try a different search or open a feed.",
  action,
  secondary,
  className = "",
  glyph = "📡",
}: Props) {
  return (
    <div
      className={"state-box signal-empty " + className}
      role="status"
      aria-live="polite"
    >
      <p className="signal-empty-glyph" aria-hidden>
        {glyph}
      </p>
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
