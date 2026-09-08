import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  isErrorReportingEnabled,
  reportError,
} from "../../lib/report-error.ts";

describe("report-error soft reporter", () => {
  it("is disabled without DSN", () => {
    const prev = process.env.SENTRY_DSN;
    const prev2 = process.env.NEXT_PUBLIC_SENTRY_DSN;
    delete process.env.SENTRY_DSN;
    delete process.env.NEXT_PUBLIC_SENTRY_DSN;
    assert.equal(isErrorReportingEnabled(), false);
    reportError(new Error("test"), { source: "unit" });
    if (prev !== undefined) process.env.SENTRY_DSN = prev;
    if (prev2 !== undefined) process.env.NEXT_PUBLIC_SENTRY_DSN = prev2;
  });
});
