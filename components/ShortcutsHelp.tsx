"use client";

import { useEffect, useState } from "react";
import { Modal } from "@/components/ui/Modal";

const ROWS: { keys: string; action: string }[] = [
  { keys: "Ctrl/⌘ + K", action: "Command palette — search & jump" },
  { keys: "A", action: "AI desk" },
  { keys: "Q", action: "Tonight queue" },
  { keys: "B", action: "Break timer" },
  { keys: "?", action: "This shortcuts panel" },
  { keys: "Esc", action: "Close overlays / palette" },
  { keys: "FAB ✦", action: "Tonight, Break, Flashback, theme, tools" },
  { keys: "🤖 panel", action: "AI assistant + API keys" },
];

export function ShortcutsHelp() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      )
        return;
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
        Press <kbd>?</kbd> again or Esc to close.
      </p>
    </Modal>
  );
}
