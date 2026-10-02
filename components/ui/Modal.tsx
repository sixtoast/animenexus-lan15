"use client";

import {
  useEffect,
  useId,
  useRef,
  type ReactNode,
  type MouseEvent,
} from "react";
import { playCue } from "@/lib/sound-engine";

export type ModalVariant = "center" | "drawer" | "sheet";

type Props = {
  open: boolean;
  onClose: () => void;
  title?: string;
  label?: string;
  variant?: ModalVariant;
  children: ReactNode;
  headerActions?: ReactNode;
  size?: "sm" | "md" | "lg";
  hideClose?: boolean;
  className?: string;
  panelClassName?: string;
  /** Skip modal SFX (e.g. nested) */
  silent?: boolean;
};

function focusables(root: HTMLElement) {
  return Array.from(
    root.querySelectorAll<HTMLElement>(
      'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])',
    ),
  ).filter((el) => !el.hasAttribute("disabled") && el.offsetParent !== null);
}

let modalLockCount = 0;
let modalLockScrollY = 0;
let modalLockSnapshot: {
  overflow: string;
  position: string;
  top: string;
  left: string;
  right: string;
  width: string;
} | null = null;

function acquireModalScrollLock() {
  if (typeof document === "undefined") return;
  const body = document.body;
  if (modalLockCount === 0) {
    modalLockScrollY = window.scrollY;
    modalLockSnapshot = {
      overflow: body.style.overflow,
      position: body.style.position,
      top: body.style.top,
      left: body.style.left,
      right: body.style.right,
      width: body.style.width,
    };
    body.style.position = "fixed";
    body.style.top = `-${modalLockScrollY}px`;
    body.style.left = "0";
    body.style.right = "0";
    body.style.width = "100%";
    body.style.overflow = "hidden";
  }
  modalLockCount += 1;
}

function releaseModalScrollLock() {
  if (typeof document === "undefined" || modalLockCount <= 0) return;
  modalLockCount -= 1;
  if (modalLockCount !== 0) return;

  const body = document.body;
  const snapshot = modalLockSnapshot;
  modalLockSnapshot = null;
  body.style.overflow = snapshot?.overflow ?? "";
  body.style.position = snapshot?.position ?? "";
  body.style.top = snapshot?.top ?? "";
  body.style.left = snapshot?.left ?? "";
  body.style.right = snapshot?.right ?? "";
  body.style.width = snapshot?.width ?? "";
  window.scrollTo({ top: modalLockScrollY, left: window.scrollX, behavior: "auto" });
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
  silent = false,
}: Props) {
  const panelRef = useRef<HTMLDivElement>(null);
  const prevFocus = useRef<HTMLElement | null>(null);
  const wasOpen = useRef(false);
  const wasOpenForFocus = useRef(false);
  const onCloseRef = useRef(onClose);
  const titleId = useId();

  // Keep the latest close handler without making the focus-trap effect
  // restart on every parent render. Restarting that effect used to run its
  // cleanup and restore focus to the original banner trigger while the modal
  // was still open, which could scroll the page back to the Synopsis section.
  onCloseRef.current = onClose;

  useEffect(() => {
    if (!open) return;
    acquireModalScrollLock();
    return () => releaseModalScrollLock();
  }, [open]);

  // Open / close cues once per transition
  useEffect(() => {
    if (open && !wasOpen.current) {
      if (!silent) playCue("modal_open");
      wasOpen.current = true;
    } else if (!open && wasOpen.current) {
      if (!silent) playCue("modal_close");
      wasOpen.current = false;
    }
  }, [open, silent]);

  useEffect(() => {
    if (!open) return;

    prevFocus.current = document.activeElement as HTMLElement | null;
    wasOpenForFocus.current = true;

    const panel = panelRef.current;
    if (!panel) return;

    const nodes = focusables(panel);
    const first = nodes[0] || panel;
    const auto = panel.querySelector<HTMLElement>(
      "[data-autofocus], input, textarea",
    );
    // Never let opening the dialog or switching focus inside it move the
    // underlying page. This is especially important when the trigger lives
    // near #story on the anime detail page.
    (auto || first).focus({ preventScroll: true });

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onCloseRef.current();
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
      // Cleanup also runs when dependencies change. Do not restore focus here:
      // doing so can steal focus from an open modal and cause browser scroll
      // restoration to the original banner trigger.
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  useEffect(() => {
    if (open || !wasOpenForFocus.current) return;

    const target = prevFocus.current;
    prevFocus.current = null;
    wasOpenForFocus.current = false;

    // Restore keyboard focus only after an actual close, and never let focus
    // restoration change the user's current scroll position.
    target?.focus?.({ preventScroll: true });
  }, [open]);

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
