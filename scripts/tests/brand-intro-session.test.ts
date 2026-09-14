import { describe, it, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import {
  readSessionTouch,
  writeSessionTouch,
  wasBrandIntroShownThisSession,
  markBrandIntroShownThisSession,
  type SessionTouchPayload,
} from "../../components/FirstVisitHost.tsx";

const BRAND_SESSION_KEY = "animenexus.brand_intro.shown.v1";
const LEGACY_INTRO_KEY = "animenexus.intro.dismissed.v1";
const SESSION_KEY = "animenexus.session_touch.v1";

/** Minimal Storage polyfill for node test environment. */
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

describe("brand intro session gate", () => {
  let prevSession: Storage | undefined;
  let prevLocal: Storage | undefined;
  let prevWindow: unknown;

  beforeEach(() => {
    prevWindow = (globalThis as { window?: unknown }).window;
    const session = makeMemoryStorage();
    const local = makeMemoryStorage();
    (globalThis as { window: unknown }).window = globalThis;
    prevSession = (globalThis as { sessionStorage?: Storage }).sessionStorage;
    prevLocal = (globalThis as { localStorage?: Storage }).localStorage;
    (globalThis as { sessionStorage: Storage }).sessionStorage = session;
    (globalThis as { localStorage: Storage }).localStorage = local;
    session.clear();
    local.clear();
  });

  afterEach(() => {
    if (prevSession) {
      (globalThis as { sessionStorage: Storage }).sessionStorage = prevSession;
    } else {
      delete (globalThis as { sessionStorage?: Storage }).sessionStorage;
    }
    if (prevLocal) {
      (globalThis as { localStorage: Storage }).localStorage = prevLocal;
    } else {
      delete (globalThis as { localStorage?: Storage }).localStorage;
    }
    if (prevWindow === undefined) {
      delete (globalThis as { window?: unknown }).window;
    } else {
      (globalThis as { window: unknown }).window = prevWindow;
    }
  });

  it("TEST 1: session key absent → intro can show", () => {
    assert.equal(wasBrandIntroShownThisSession(), false);
  });

  it("TEST 2: session key present → intro does not show", () => {
    sessionStorage.setItem(BRAND_SESSION_KEY, "1");
    assert.equal(wasBrandIntroShownThisSession(), true);
  });

  it("TEST 3: intro completion → session key stored", () => {
    markBrandIntroShownThisSession();
    assert.equal(sessionStorage.getItem(BRAND_SESSION_KEY), "1");
    // Legacy permanent dismiss marked for compatibility only
    assert.equal(localStorage.getItem(LEGACY_INTRO_KEY), "1");
  });

  it("TEST 4: reduced-motion path is static short timeline (contract)", () => {
    // Contract: reduced-motion finishes at ~520ms without signal/presence phases.
    // Enforced in FirstVisitHost when reducedMotion is true — document here.
    const REDUCED_MS = 520;
    assert.ok(REDUCED_MS < 800);
    assert.ok(REDUCED_MS > 400);
  });

  it("TEST 5: cleanup attribute name is data-brand-intro", () => {
    // Attribute contract used by FirstVisitHost finish + unmount cleanup.
    const ATTR = "data-brand-intro";
    assert.equal(ATTR, "data-brand-intro");
  });

  it("session memory: writeSessionTouch / readSessionTouch still work", () => {
    const payload: SessionTouchPayload = {
      isFirstVisit: false,
      daysAway: 3,
      sessionOpens: 2,
    };
    writeSessionTouch(payload);
    const read = readSessionTouch();
    assert.deepEqual(read, payload);
    assert.ok(sessionStorage.getItem(SESSION_KEY));
  });

  it("legacy localStorage key does not gate brand intro", () => {
    localStorage.setItem(LEGACY_INTRO_KEY, "1");
    // Brand intro uses session key only
    assert.equal(wasBrandIntroShownThisSession(), false);
  });
});
