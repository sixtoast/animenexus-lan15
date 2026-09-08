/**
 * Soft error reporting — works with Sentry DSN when set, otherwise console only.
 * No @sentry/* package required. Safe on server and client.
 */

type ReportContext = Record<string, unknown>;

function parseDsn(dsn: string): {
  publicKey: string;
  host: string;
  projectId: string;
} | null {
  try {
    const u = new URL(dsn);
    const publicKey = u.username;
    const projectId = u.pathname.replace(/^\//, "").split("/")[0];
    if (!publicKey || !projectId) return null;
    return { publicKey, host: u.host, projectId };
  } catch {
    return null;
  }
}

function getDsn(): string {
  return (
    (typeof process !== "undefined" &&
      (process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN)) ||
    ""
  ).trim();
}

export function isErrorReportingEnabled(): boolean {
  return Boolean(getDsn());
}

function serializeError(error: unknown): {
  type: string;
  value: string;
  stack?: string;
} {
  if (error instanceof Error) {
    return {
      type: error.name || "Error",
      value: error.message || String(error),
      stack: error.stack,
    };
  }
  return { type: "Error", value: String(error) };
}

/** Fire-and-forget error report. Never throws. */
export function reportError(error: unknown, context?: ReportContext): void {
  try {
    const serialized = serializeError(error);
    if (process.env.NODE_ENV !== "production") {
      console.error("[reportError]", serialized.value, context || "");
    }

    const dsn = getDsn();
    if (!dsn) return;

    const parsed = parseDsn(dsn);
    if (!parsed) return;

    const url = `https://${parsed.host}/api/${parsed.projectId}/store/`;
    const payload = {
      event_id: cryptoRandomId(),
      timestamp: new Date().toISOString(),
      platform: "javascript",
      level: "error",
      server_name: "animenexus-lantern",
      environment:
        process.env.NEXT_PUBLIC_VERCEL_ENV ||
        process.env.NODE_ENV ||
        "development",
      exception: {
        values: [
          {
            type: serialized.type,
            value: serialized.value,
            stacktrace: serialized.stack
              ? {
                  frames: serialized.stack
                    .split("\n")
                    .slice(1, 12)
                    .map((line) => ({ filename: line.trim() })),
                }
              : undefined,
          },
        ],
      },
      tags: {
        runtime: typeof window === "undefined" ? "server" : "client",
      },
      extra: context || {},
    };

    const body = JSON.stringify(payload);
    if (typeof navigator !== "undefined" && navigator.sendBeacon) {
      const blob = new Blob([body], { type: "application/json" });
      navigator.sendBeacon(
        `${url}?sentry_version=7&sentry_key=${parsed.publicKey}`,
        blob,
      );
      return;
    }

    void fetch(`${url}?sentry_version=7&sentry_key=${parsed.publicKey}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Sentry-Auth": `Sentry sentry_version=7, sentry_key=${parsed.publicKey}`,
      },
      body,
      keepalive: true,
    }).catch(() => {});
  } catch {
    /* never throw from reporter */
  }
}

function cryptoRandomId(): string {
  try {
    if (typeof crypto !== "undefined" && crypto.randomUUID) {
      return crypto.randomUUID().replace(/-/g, "");
    }
  } catch {
    /* fall through */
  }
  return Array.from({ length: 32 }, () =>
    Math.floor(Math.random() * 16).toString(16),
  ).join("");
}

/** Window-level hooks for uncaught errors (call once from a client component). */
export function installClientErrorHooks(): () => void {
  if (typeof window === "undefined") return () => {};

  const onError = (event: ErrorEvent) => {
    reportError(event.error || event.message, {
      source: "window.onerror",
      filename: event.filename,
      lineno: event.lineno,
    });
  };
  const onRejection = (event: PromiseRejectionEvent) => {
    reportError(event.reason, { source: "unhandledrejection" });
  };

  window.addEventListener("error", onError);
  window.addEventListener("unhandledrejection", onRejection);
  return () => {
    window.removeEventListener("error", onError);
    window.removeEventListener("unhandledrejection", onRejection);
  };
}
