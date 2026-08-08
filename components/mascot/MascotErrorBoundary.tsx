"use client";

import { Component, type ReactNode } from "react";

type Props = { children: ReactNode; fallback?: ReactNode };
type State = { hasError: boolean; key: number };

/**
 * Isolates companion crashes so the rest of the app keeps working.
 * Retry remounts children with a new key.
 */
export class MascotErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, key: 0 };

  static getDerivedStateFromError(): Partial<State> {
    return { hasError: true };
  }

  componentDidCatch(err: unknown) {
    if (typeof console !== "undefined") {
      console.warn("[Lantern-ko] companion suspended:", err);
    }
  }

  retry = () => {
    this.setState((s) => ({ hasError: false, key: s.key + 1 }));
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;
      return (
        <button
          type="button"
          className="mascot-enable"
          onClick={this.retry}
          title="Retry companion"
          aria-label="Retry companion"
        >
          🕯️
        </button>
      );
    }
    return <div key={this.state.key}>{this.props.children}</div>;
  }
}
