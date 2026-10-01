"use client";

import { useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { playCue } from "@/lib/sound-engine";

type Props = {
  className?: string;
  children?: ReactNode;
  fallback?: string;
};

export function DetailBackButton({
  className = "detail-back",
  children = "← Back",
  fallback = "/browse",
}: Props) {
  const router = useRouter();

  function goBack() {
    playCue("filter_select");
    if (window.history.length > 1) {
      router.back();
    } else {
      router.push(fallback);
    }
  }

  return (
    <button type="button" className={className} onClick={goBack}>
      {children}
    </button>
  );
}
