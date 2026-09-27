"use client";

import dynamic from "next/dynamic";
import { useState } from "react";

const AIPanel = dynamic(
  () => import("@/components/AIPanel").then((module) => module.AIPanel),
  { ssr: false },
);

export function AIPanelLazy() {
  const [loaded, setLoaded] = useState(false);

  if (!loaded) {
    return (
      <button
        type="button"
        className="ai-fab"
        aria-label="Open AI panel"
        title="AI panel (A)"
        onClick={() => setLoaded(true)}
      >
        🤖
        <span className="ai-status-dot" aria-hidden />
      </button>
    );
  }

  return <AIPanel initialOpen />;
}
