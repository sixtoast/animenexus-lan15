"use client";

import { Component, type ReactNode } from "react";

type Props = {
  children: ReactNode;
  /** Optional label for the error panel */
  label?: string;
};

type State = {
  hasError: boolean;
  message: string;
  key: number;
};

/**
 * Isolates companion crashes. No silent 2D fallback — shows the real error.
 */
export class MascotErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, message: "", key: 0 };

  static getDerivedStateFromError(err: unknown): Partial<State> {
    const message =
      err instanceof Error
        ? err.message
        : typeof err === "string"
          ? err
          : "Unknown render error";
    return { hasError: true, message };
  }

  componentDidCatch(err: unknown) {
    console.error("[Lantern-ko] 3D companion crashed:", err);
  }

  retry = () => {
    this.setState((s) => ({
      hasError: false,
      message: "",
      key: s.key + 1,
    }));
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="mascot-error" role="alert">
          <strong>3D companion failed</strong>
          <p>{this.state.message || "WebGL / R3F error"}</p>
          <button type="button" className="mascot-error-retry" onClick={this.retry}>
            Retry 3D
          </button>
        </div>
      );
    }
    return <div key={this.state.key}>{this.props.children}</div>;
  }
}
