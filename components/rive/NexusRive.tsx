"use client";

import {
  Component,
  Suspense,
  lazy,
  useEffect,
  useMemo,
  useState,
  type ComponentType,
  type CSSProperties,
  type ErrorInfo,
  type ReactNode,
} from "react";
import {
  creativeAllowsRive,
  detectCreativeCapabilities,
} from "@/lib/creative-runtime";
import { prefersReducedMotion } from "@/lib/view-transition";
import { RiveFallback } from "./RiveFallback";
import {
  applyRiveState,
  type RiveBridgeTarget,
  type RiveInputState,
} from "./RiveStateBridge";

export type NexusRiveProps = {
  /** Path under public/ or absolute URL to .riv */
  src: string;
  stateMachines?: string | string[];
  artboard?: string;
  animations?: string | string[];
  className?: string;
  style?: CSSProperties;
  /** Semantic app state → Rive inputs (Sprint 3 convention) */
  appState?: RiveInputState;
  /** When false, do not autoplay */
  autoplay?: boolean;
  /** Above-the-fold: load immediately; else wait for visibility */
  priority?: boolean;
  /** Accessible name for the canvas region */
  label?: string;
  /** Static children when Rive blocked / RM / error */
  fallback?: ReactNode;
  width?: number | string;
  height?: number | string;
  onRiveReady?: (bridge: RiveBridgeTarget) => void;
};

type UseRiveResult = {
  RiveComponent: ComponentType<Record<string, unknown>>;
  rive: {
    cleanup?: () => void;
    play?: () => void;
    pause?: () => void;
    stateMachineInputs?: (name: string) => Array<{
      name: string;
      value?: boolean | number;
      fire?: () => void;
    }> | undefined;
  } | null;
};

/** Lazy: do not pull Rive WASM into the main bundle until needed. */
const LazyRiveInner = lazy(() =>
  import("@rive-app/react-canvas").then((mod) => {
    const useRive = mod.useRive as (opts: Record<string, unknown>) => UseRiveResult;
    const Layout = mod.Layout;
    const Fit = mod.Fit;
    const Alignment = mod.Alignment;

    function RiveInner(props: NexusRiveProps & { active: boolean }) {
      const {
        src,
        stateMachines,
        artboard,
        animations,
        autoplay = true,
        appState,
        onRiveReady,
        className,
        style,
        width,
        height,
        label,
        active,
      } = props;

      const { RiveComponent, rive } = useRive({
        src,
        stateMachines,
        artboard,
        animations,
        autoplay: autoplay && active,
        layout: new Layout({
          fit: Fit.Contain,
          alignment: Alignment.Center,
        }),
      });

      useEffect(() => {
        if (!rive || !active) return;
        const smName = Array.isArray(stateMachines)
          ? stateMachines[0]
          : stateMachines;

        const bridge: RiveBridgeTarget = {
          fire: (name: string) => {
            if (!smName || !rive.stateMachineInputs) return;
            const inputs = rive.stateMachineInputs(smName) || [];
            const input = inputs.find((i) => i.name === name);
            input?.fire?.();
          },
          setBool: (name: string, value: boolean) => {
            if (!smName || !rive.stateMachineInputs) return;
            const inputs = rive.stateMachineInputs(smName) || [];
            const input = inputs.find((i) => i.name === name);
            if (input && typeof input.value === "boolean") {
              (input as { value: boolean }).value = value;
            }
          },
          setNumber: (name: string, value: number) => {
            if (!smName || !rive.stateMachineInputs) return;
            const inputs = rive.stateMachineInputs(smName) || [];
            const input = inputs.find((i) => i.name === name);
            if (input && typeof input.value === "number") {
              (input as { value: number }).value = value;
            }
          },
        };

        onRiveReady?.(bridge);
        if (appState) applyRiveState(bridge, appState);

        return () => {
          try {
            rive.cleanup?.();
          } catch {
            /* */
          }
        };
      }, [rive, active, stateMachines, onRiveReady, appState]);

      useEffect(() => {
        if (!rive || !appState) return;
        const smName = Array.isArray(stateMachines)
          ? stateMachines[0]
          : stateMachines;
        if (!smName || !rive.stateMachineInputs) return;
        const bridge: RiveBridgeTarget = {
          fire: (name) => {
            const inputs = rive.stateMachineInputs!(smName) || [];
            inputs.find((i) => i.name === name)?.fire?.();
          },
          setBool: (name, value) => {
            const inputs = rive.stateMachineInputs!(smName) || [];
            const input = inputs.find((i) => i.name === name);
            if (input && typeof input.value === "boolean") {
              (input as { value: boolean }).value = value;
            }
          },
          setNumber: (name, value) => {
            const inputs = rive.stateMachineInputs!(smName) || [];
            const input = inputs.find((i) => i.name === name);
            if (input && typeof input.value === "number") {
              (input as { value: number }).value = value;
            }
          },
        };
        applyRiveState(bridge, appState);
      }, [appState, rive, stateMachines]);

      useEffect(() => {
        if (!rive) return;
        if (active) rive.play?.();
        else rive.pause?.();
      }, [active, rive]);

      return (
        <div
          className={className}
          style={{ width, height, ...style }}
          role="img"
          aria-label={label}
          data-nexus-rive="1"
        >
          <RiveComponent />
        </div>
      );
    }

    return { default: RiveInner };
  }),
);

class RiveErrorBoundary extends Component<
  { fallback: ReactNode; children: ReactNode },
  { error: boolean }
> {
  state = { error: false };

  static getDerivedStateFromError() {
    return { error: true };
  }

  componentDidCatch(err: Error, info: ErrorInfo) {
    if (process.env.NODE_ENV !== "production") {
      console.warn("[NexusRive]", err, info.componentStack);
    }
  }

  render() {
    if (this.state.error) return this.props.fallback;
    return this.props.children;
  }
}

function useInView(enabled: boolean) {
  const [node, setNode] = useState<HTMLElement | null>(null);
  const [visible, setVisible] = useState(!enabled);

  useEffect(() => {
    if (!enabled || !node) {
      setVisible(true);
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          setVisible(!!e.isIntersecting);
        }
      },
      { rootMargin: "48px", threshold: 0.05 },
    );
    io.observe(node);
    return () => io.disconnect();
  }, [enabled, node]);

  return { setNode, visible };
}

/**
 * AnimeNexus Rive host — gated by creative runtime, RM-safe, lazy WASM.
 * Native controls stay outside this component (presentation only).
 * Continuous in-view + tab visibility: pause rather than burn GPU off-screen.
 */
export function NexusRive(props: NexusRiveProps) {
  const {
    priority = false,
    fallback,
    label,
    className,
    style,
    width = "100%",
    height = 120,
  } = props;

  const [mounted, setMounted] = useState(false);
  const [pageVisible, setPageVisible] = useState(true);

  useEffect(() => {
    setMounted(true);
    const onVis = () => setPageVisible(document.visibilityState === "visible");
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, []);

  const { setNode, visible } = useInView(mounted && !priority);
  const [hasBeenVisible, setHasBeenVisible] = useState(priority);
  useEffect(() => {
    if (visible || priority) setHasBeenVisible(true);
  }, [visible, priority]);

  const gate = useMemo(() => {
    if (!mounted) return { allow: false, reason: "loading" as const };
    if (prefersReducedMotion()) return { allow: false, reason: "reduced" as const };
    if (!creativeAllowsRive()) {
      const tier = detectCreativeCapabilities().tier;
      return {
        allow: false,
        reason: (tier === "MINIMAL" ? "blocked" : "blocked") as const,
      };
    }
    return { allow: true, reason: "loading" as const };
  }, [mounted]);

  const shellStyle: CSSProperties = {
    width,
    height,
    ...style,
  };

  const fallbackNode = (
    <RiveFallback
      label={label}
      className={className}
      style={shellStyle}
      reason={gate.reason}
    >
      {fallback}
    </RiveFallback>
  );

  if (!mounted) {
    return (
      <div ref={setNode as (n: HTMLDivElement | null) => void}>
        {fallbackNode}
      </div>
    );
  }

  if (!gate.allow) {
    return (
      <div ref={setNode as (n: HTMLDivElement | null) => void}>
        {fallbackNode}
      </div>
    );
  }

  if (!hasBeenVisible) {
    return (
      <div
        ref={setNode as (n: HTMLDivElement | null) => void}
        style={shellStyle}
        className={className}
        data-nexus-rive-pending="1"
      >
        <RiveFallback label={label} reason="loading" style={{ width: "100%", height: "100%" }}>
          {fallback}
        </RiveFallback>
      </div>
    );
  }

  return (
    <div ref={setNode as (n: HTMLDivElement | null) => void}>
      <RiveErrorBoundary fallback={fallbackNode}>
        <Suspense fallback={fallbackNode}>
          <LazyRiveInner
            {...props}
            active={pageVisible && (visible || priority)}
            width={width}
            height={height}
          />
        </Suspense>
      </RiveErrorBoundary>
    </div>
  );
}
