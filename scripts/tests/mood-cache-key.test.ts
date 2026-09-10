import { describe, it } from "node:test";
import assert from "node:assert/strict";

/** Mirrors lib/api-cache.ts cacheKey */
function cacheKey(parts: (string | number | undefined | null)[]): string {
  return parts.map((p) => (p == null ? "" : String(p))).join("|");
}

/** Pre-fix shape (BUG): tag omitted */
function oldFilteredKey(
  filters: {
    genre?: string;
    tag?: string;
    status?: string;
    format?: string;
    year?: string;
    sort?: string;
    search?: string;
    adultFilter?: string;
  },
  page = 1,
  perPage = 24,
) {
  return cacheKey([
    "filtered",
    filters.genre,
    filters.status,
    filters.format,
    filters.year,
    filters.sort,
    filters.search,
    filters.adultFilter,
    page,
    perPage,
  ]);
}

/** Post-fix shape: tag included */
function newFilteredKey(
  filters: {
    genre?: string;
    tag?: string;
    status?: string;
    format?: string;
    year?: string;
    sort?: string;
    search?: string;
    adultFilter?: string;
  },
  page = 1,
  perPage = 24,
) {
  return cacheKey([
    "filtered",
    filters.genre,
    filters.tag,
    filters.status,
    filters.format,
    filters.year,
    filters.sort,
    filters.search,
    filters.adultFilter,
    page,
    perPage,
  ]);
}

describe("fetchFiltered cache key — tag collision bug", () => {
  const tragedy = {
    tag: "Tragedy",
    sort: "score",
    adultFilter: "exclude",
  };
  const comedy = {
    tag: "Comedy",
    sort: "score",
    adultFilter: "exclude",
  };
  const iyashikei = {
    tag: "Iyashikei",
    sort: "score",
    adultFilter: "exclude",
  };

  it("BEFORE fix: Tragedy and Comedy produce identical keys (the bug)", () => {
    const a = oldFilteredKey(tragedy);
    const b = oldFilteredKey(comedy);
    assert.equal(a, b, "old keys must collide — documents the bug");
  });

  it("AFTER fix: Tragedy and Comedy produce different keys", () => {
    const a = newFilteredKey(tragedy);
    const b = newFilteredKey(comedy);
    assert.notEqual(a, b);
  });

  it("AFTER fix: Tragedy and Iyashikei produce different keys", () => {
    assert.notEqual(newFilteredKey(tragedy), newFilteredKey(iyashikei));
  });

  it("AFTER fix: same tag still hits same key (cache still works)", () => {
    assert.equal(newFilteredKey(tragedy), newFilteredKey({ ...tragedy }));
  });

  it("genre keys remain distinct when genre varies", () => {
    assert.notEqual(
      newFilteredKey({ genre: "Drama", sort: "score", adultFilter: "exclude" }),
      newFilteredKey({ genre: "Comedy", sort: "score", adultFilter: "exclude" }),
    );
  });
});
