"use client";

import { useCallback, useRef, useState } from "react";

export type AsyncOutcome = "idle" | "pending" | "success" | "error";

/**
 * Tracks async visual outcome only from real resolve/reject.
 * Never mark success optimistically.
 */
export function useAsyncOutcome(successHoldMs = 900) {
  const [outcome, setOutcome] = useState<AsyncOutcome>("idle");
  const hold = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearHold = () => {
    if (hold.current) {
      clearTimeout(hold.current);
      hold.current = null;
    }
  };

  const begin = useCallback(() => {
    clearHold();
    setOutcome("pending");
  }, []);

  const markSuccess = useCallback(() => {
    clearHold();
    setOutcome("success");
    hold.current = setTimeout(() => setOutcome("idle"), successHoldMs);
  }, [successHoldMs]);

  const markError = useCallback(() => {
    clearHold();
    setOutcome("error");
  }, []);

  const reset = useCallback(() => {
    clearHold();
    setOutcome("idle");
  }, []);

  /** Wrap a promise — success only after resolve */
  const track = useCallback(
    async <T,>(p: Promise<T>): Promise<T> => {
      begin();
      try {
        const v = await p;
        markSuccess();
        return v;
      } catch (e) {
        markError();
        throw e;
      }
    },
    [begin, markSuccess, markError],
  );

  return {
    outcome,
    pending: outcome === "pending",
    success: outcome === "success",
    error: outcome === "error",
    begin,
    markSuccess,
    markError,
    reset,
    track,
  };
}
