"use client";

import { useEffect, useState } from "react";
import {
  readViewMode,
  writeViewMode,
  type ViewMode,
} from "@/lib/theme";

const MODES: { id: ViewMode; label: string }[] = [
  { id: "grid", label: "Grid" },
  { id: "poster", label: "Poster" },
  { id: "shelf", label: "Shelf" },
];

type Props = {
  onChange?: (mode: ViewMode) => void;
};

export function ViewModeToggle({ onChange }: Props) {
  const [mode, setMode] = useState<ViewMode>("grid");

  useEffect(() => {
    const m = readViewMode();
    setMode(m);
    document.documentElement.dataset.viewMode = m;
    onChange?.(m);
  }, [onChange]);

  function select(m: ViewMode) {
    setMode(m);
    writeViewMode(m);
    document.documentElement.dataset.viewMode = m;
    onChange?.(m);
  }

  return (
    <div className="view-toggle-bar" role="group" aria-label="View mode">
      {MODES.map((m) => (
        <button
          key={m.id}
          type="button"
          data-view={m.id}
          className={mode === m.id ? "active" : undefined}
          onClick={() => select(m.id)}
        >
          {m.label}
        </button>
      ))}
    </div>
  );
}
