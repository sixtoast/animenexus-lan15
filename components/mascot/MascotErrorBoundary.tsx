"use client";

import { Component, type ReactNode } from "react";

type Props = { children: ReactNode };
type State = { hasError: boolean };

/**
 * Isolates mascot crashes so the rest of the app keeps working (Sprint M10).
 */
export class MascotErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(err: unknown) {
    if (typeof console !== "undefined") {
      console.warn("[Lantern-ko] companion suspended:", err);
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        <button
          type="button"
          className="mascot-enable"
          onClick={() => this.setState({ hasError: false })}
          title="Retry companion"
          aria-label="Retry companion"
        >
          \uD83E\uDD94
        </button>
      );
    }
    return this.props.children;
  }
}
