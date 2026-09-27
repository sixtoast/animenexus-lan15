"use client";

import dynamic from "next/dynamic";

const AIPanel = dynamic(
  () => import("@/components/AIPanel").then((module) => module.AIPanel),
  { ssr: false },
);

export function AIPanelLazy() {
  return <AIPanel />;
}
