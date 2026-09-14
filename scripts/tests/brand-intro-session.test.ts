import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  BRAND_SESSION_KEY,
  BRAND_INTRO_TIMING,
  shouldShowBrandIntro,
  markBrandIntroShown,
} from "../../lib/brand-intro-session.ts";

function makeMemoryStorage(): Storage {
  const map = new Map<string, string>();
  return {
    get length() {
      return map.size;
    },
    clear() {
      map.clear();
    },
    getItem(key: string) {
      return map.has(key) ? map.get(key)! : null;
    },
    setItem(key: string, value: string) {
      map.set(key, String(value));
    },
    removeItem(key: string) {
      map.delete(key);
    },
    key(index: number) {
      return Array.from(map.keys())[index] ?? null;
    },
  };
}

function throwingStorage(): Storage {
  const boom = () => {
    throw new Error("storage unavailable");
  };
  return {
    get length() {
      return 0;
    },
    clear: boom,
    getItem: boom as Storage["getItem"],
    setItem: boom as Storage["setItem"],
    removeItem: boom,
    key: boom as Storage["key"],
  };
}

describe("brand intro session gate (production)", () => {
  it("TEST 1: session key absent → shouldShowBrandIntro === true", () => {
    const session = makeMemoryStorage();
    assert.equal(shouldShowBrandIntro(session), true);
  });

  it("TEST 2: session key present → shouldShowBrandIntro === false", () => {
    const session = makeMemoryStorage();
    session.setItem(BRAND_SESSION_KEY, "1");
    assert.equal(shouldShowBrandIntro(session), false);
  });

  it("TEST 3: markBrandIntroShown writes production session key", () => {
    const session = makeMemoryStorage();
    const local = makeMemoryStorage();
    markBrandIntroShown(session, local);
    assert.equal(session.getItem(BRAND_SESSION_KEY), "1");
  });

  it("TEST 4: storage throws → intro logic fails safely (still true)", () => {
    assert.equal(shouldShowBrandIntro(throwingStorage()), true);
    assert.doesNotThrow(() =>
      markBrandIntroShown(throwingStorage(), throwingStorage()),
    );
  });

  it("TEST 5: production constant is animenexus.brand_intro.shown.v1", () => {
    assert.equal(BRAND_SESSION_KEY, "animenexus.brand_intro.shown.v1");
  });

  it("timing constants are shared production values", () => {
    assert.equal(BRAND_INTRO_TIMING.spark, 120);
    assert.equal(BRAND_INTRO_TIMING.exit, 1520);
    assert.equal(BRAND_INTRO_TIMING.reducedExit, 520);
  });
});
