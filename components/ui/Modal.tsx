"use client";

import {
  useEffect,
  useId,
  useRef,
  type ReactNode,
  type MouseEvent,
} from "react";

export type ModalVariant = "center" | "drawer" | "sheet";

type Props = {
  open: boolean;
  onClose: () => void;
  title?: string;
  /** Accessible name when title is omitted or visual-only */
  label?: string;
  variant?: ModalVariant;
  children: ReactNode;
  /** Optional header actions (settings icons, etc.) */
  headerActions?: ReactNode;
  /** Wider center modal */
  size?: "sm" | "md" | "lg";
  /** Hide default close button */
  hideClose?: boolean;
  className?: string;
  panelClassName?: string;
};

function focusables(root: HTMLElement) {
  return Array.from(
    root.querySelectorAll<HTMLElement>(
      'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])',
    ),
  ).filter((el) => !el.hasAttribute("disabled") && el.offsetParent !== null);
}

export function Modal({
  open,
  onClose,
  title,
  label,
  variant = "center",
  children,
  headerActions,
  size = "md",
  hideClose,
  className,
  panelClassName,
}: Props) {
  const panelRef = useRef<HTMLDivElement>(null);
  const prevFocus = useRef<HTMLElement | null>(null);
  const titleId = useId();

  // Body scroll lock
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  // Focus management
  useEffect(() => {
    if (!open) return;
    prevFocus.current = document.activeElement as HTMLElement | null;
    const panel = panelRef.current;
    if (!panel) return;

    const nodes = focusables(panel);
    const first = nodes[0] || panel;
    // Prefer autofocus input
    const auto = panel.querySelector<HTMLElement>("[data-autofocus], input, textarea");
    (auto || first).focus();

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
        return;
      }
      if (e.key !== "Tab" || !panelRef.current) return;
      const list = focusables(panelRef.current);
      if (list.length === 0) {
        e.preventDefault();
        return;
      }
      const i = list.indexOf(document.activeElement as HTMLElement);
      if (e.shiftKey) {
        if (i <= 0) {
          e.preventDefault();
          list[list.length - 1].focus();
        }
      } else if (i === list.length - 1 || i === -1) {
        e.preventDefault();
        list[0].focus();
      }
    };

    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      prevFocus.current?.focus?.();
    };
  }, [open, onClose]);

  if (!open) return null;

  const onBackdrop = (e: MouseEvent) => {
    if (e.target === e.currentTarget) onClose();
  };

  return (
    <div
      className={
        "nx-modal-overlay nx-modal-" +
        variant +
        (className ? " " + className : "")
      }
      role="presentation"
      onMouseDown={onBackdrop}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? titleId : undefined}
        aria-label={!title ? label || "Dialog" : undefined}
        className={
          "nx-modal-panel nx-modal-size-" +
          size +
          (panelClassName ? " " + panelClassName : "")
        }
        tabIndex={-1}
        onMouseDown={(e) => e.stopPropagation()}
      >
        {(title || headerActions || !hideClose) && (
          <div className="nx-modal-head">
            {title ? (
              <h2 id={titleId} className="nx-modal-title">
                {title}
              </h2>
            ) : (
              <span className="nx-modal-title-spacer" />
            )}
            <div className="nx-modal-head-actions">
              {headerActions}
              {!hideClose ? (
                <button
                  type="button"
                  className="btn btn-icon btn-sm"
                  onClick={onClose}
                  aria-label="Close"
                >
                  ×
                </button>
              ) : null}
            </div>
          </div>
        )}
        <div className="nx-modal-body">{children}</div>
      </div>
    </div>
  );
}
