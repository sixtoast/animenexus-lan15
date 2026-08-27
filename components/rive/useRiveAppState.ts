"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  applyRiveState,
  resolveRiveState,
  type AsyncVisualStatus,
  type PointerVisualStatus,
  type RiveBridgeTarget,
  type RiveInputState,
} from "./RiveStateBridge";

export type UseRiveAppStateOptions = {
  /** Clear success/error after ms (presentation only; app state unchanged) */
  pulseMs?: number;
};

/**
 * Connect real UI + async status to a Rive bridge.
 * Success must be set only after the operation resolves OK.
 */
export function useRiveAppState(
  initial?: AsyncVisualStatus,
  opts?: UseRiveAppStateOptions,
) {
  const pulseMs = opts?.pulseMs ?? 1200;
  const [asyncStatus, setAsyncStatus] = useState<AsyncVisualStatus>(
    initial || {},
  );
  const [pointer, setPointer] = useState<PointerVisualStatus>({});
  const bridgeRef = useRef<RiveBridgeTarget | null>(null);
  const pulseTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const state: RiveInputState = resolveRiveState(asyncStatus, pointer);

  const push = useCallback((next: RiveInputState) => {
    applyRiveState(bridgeRef.current, next);
  }, []);

  useEffect(() => {
    push(state);
  }, [state, push]);

  const bindBridge = useCallback(
    (bridge: RiveBridgeTarget) => {
      bridgeRef.current = bridge;
      applyRiveState(bridge, resolveRiveState(asyncStatus, pointer));
    },
    [asyncStatus, pointer],
  );

  const setAsync = useCallback(
    (partial: AsyncVisualStatus) => {
      setAsyncStatus((prev) => {
        const next = { ...prev, ...partial };
        // Mutual exclusion for terminal flags
        if (partial.loading) {
          next.error = false;
          next.success = false;
        }
        if (partial.success) {
          next.loading = false;
          next.error = false;
        }
        if (partial.error) {
          next.loading = false;
          next.success = false;
        }
        return next;
      });

      if (partial.success || partial.error) {
        if (pulseTimer.current) clearTimeout(pulseTimer.current);
        pulseTimer.current = setTimeout(() => {
          setAsyncStatus((prev) => ({
            ...prev,
            success: false,
            error: false,
          }));
        }, pulseMs);
      }
    },
    [pulseMs],
  );

  /** Call only after Promise resolves successfully. */
  const markSuccess = useCallback(() => {
    setAsync({ loading: false, success: true, error: false });
  }, [setAsync]);

  /** Call only after Promise rejects / returns error. */
  const markError = useCallback(() => {
    setAsync({ loading: false, error: true, success: false });
  }, [setAsync]);

  const markLoading = useCallback((loading = true) => {
    setAsync({ loading, success: false, error: false });
  }, [setAsync]);

  /**
 * Wrap an async action: loading → success | error from real outcome.
 */
  const runTracked = useCallback(
    async <T,>(fn: () => Promise<T>): Promise<T> => {
      markLoading(true);
      try {
        const result = await fn();
        markSuccess();
        return result;
      } catch (e) {
        markError();
        throw e;
      }
    },
    [markLoading, markSuccess, markError],
  );

  const pointerHandlers = {
    onPointerEnter: () => setPointer((p) => ({ ...p, hover: true })),
    onPointerLeave: () => setPointer({ hover: false, pressed: false }),
    onPointerDown: () => setPointer((p) => ({ ...p, pressed: true })),
    onPointerUp: () => setPointer((p) => ({ ...p, pressed: false })),
    onFocus: () => setPointer((p) => ({ ...p, hover: true })),
    onBlur: () => setPointer({ hover: false, pressed: false }),
  };

  useEffect(() => {
    return () => {
      if (pulseTimer.current) clearTimeout(pulseTimer.current);
    };
  }, []);

  return {
    state,
    asyncStatus,
    setAsync,
    markLoading,
    markSuccess,
    markError,
    runTracked,
    bindBridge,
    pointerHandlers,
  };
}
