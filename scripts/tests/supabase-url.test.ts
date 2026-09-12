/**
 * Supabase URL validation — rejects dashboard prose, accepts bare origin.
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { validateSupabaseUrl } from "../../lib/supabase/config.ts";

describe("validateSupabaseUrl", () => {
  it("accepts bare project origin", () => {
    const origin = validateSupabaseUrl(
      "https://vlhfagpxoizlvsqpgmrd.supabase.co",
    );
    assert.equal(origin, "https://vlhfagpxoizlvsqpgmrd.supabase.co");
  });

  it("trims whitespace around a valid origin", () => {
    const origin = validateSupabaseUrl(
      "  https://vlhfagpxoizlvsqpgmrd.supabase.co  ",
    );
    assert.equal(origin, "https://vlhfagpxoizlvsqpgmrd.supabase.co");
  });

  it("rejects dashboard prose with Markdown backticks", () => {
    assert.throws(
      () =>
        validateSupabaseUrl(
          "Your project URL is: `https://vlhfagpxoizlvsqpgmrd.supabase.co`",
        ),
      /Invalid Supabase project URL/,
    );
  });

  it("rejects missing value", () => {
    assert.throws(() => validateSupabaseUrl(undefined), /missing/i);
    assert.throws(() => validateSupabaseUrl(""), /missing/i);
  });

  it("rejects /rest/v1 path on the project URL", () => {
    assert.throws(
      () =>
        validateSupabaseUrl(
          "https://vlhfagpxoizlvsqpgmrd.supabase.co/rest/v1/",
        ),
      /origin only|Invalid/,
    );
  });

  it("rejects http", () => {
    assert.throws(
      () => validateSupabaseUrl("http://vlhfagpxoizlvsqpgmrd.supabase.co"),
      /Invalid/,
    );
  });
});
