"use client";

import { useEffect, useState } from "react";
import { Modal } from "@/components/ui/Modal";

const ROWS: { keys: string; action: string }[] = [
  { keys: "Ctrl/⌘ + K", action: "Command palette — search, intent, jump" },
  { keys: "A", action: "AI desk" },
  { keys: "Q", action: "Tonight queue" },
  { keys: "B", action: "Break timer" },
  { keys: "H", action: "Home" },
  { keys: "W", action: "Watchlist" },
  { keys: "R", action: "Browse" },
  { keys: "T", action: "Taste" },
  { keys: "D", action: "Daily pick" },
  { keys: "S", action: "Seasonal" },
  { keys: "M", action: "Account / services" },
  { keys: "?", action: "This shortcuts panel" },
  { keys: "Esc", action: "Close overlays / palette" },
  { keys: "FAB ✦", action: "Tonight, Break, Flashback, theme, tools" },
  { keys: "Home packs", action: "Tonight feel chips → experience browse" },
  { keys: "Dials", action: "Intensity / energy / time on home session bar" },
  { keys: "Share session", action: "Copy home URL with intent + dials" },
  { keys: "Cmd+K → dials", action: "Type light / energy / 30 to set session" },
];

export function ShortcutsHelp() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        e.target instanceof HTMLSelectElement
      )
        return;
      if ((e.target as HTMLElement)?.isContentEditable) return;
      if (e.key === "?" || (e.shiftKey && e.key === "/")) {
        e.preventDefault();
        setOpen((v) => !v);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <Modal
      open={open}
      onClose={() => setOpen(false)}
      title="Shortcuts"
      label="Keyboard shortcuts"
      variant="center"
      size="sm"
    >
      <table className="shortcuts-table">
        <tbody>
          {ROWS.map((r) => (
            <tr key={r.keys}>
              <td>
                <kbd>{r.keys}</kbd>
              </td>
              <td>{r.action}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="tools-hint" style={{ marginTop: 12 }}>
        Press <kbd>?</kbd> again or Esc to close. Keys are ignored while typing.
      </p>
    </Modal>
  );
}
