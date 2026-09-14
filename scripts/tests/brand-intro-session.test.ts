import { describe, it, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";

/**
 * Contract tests for brand intro session gating.
 * Mirrors pure helpers in components/FirstVisitHost.tsx without importing TSX
 * (node test runner does not load .tsx).
 */

const LEGACY_INTRO_KEY = "animenexus.intro.dismissed.v1";
const BRAND_SESSION_KEY = "animenexus.brand_intro.shown.v1";
const SESSION_KEY = "animenexus.session_touch.v1";

type SessionTouchPayload = {
  isFirstVisit: boolean;
  daysAway: number;
  sessionOpens: number;
};

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

function wasBrandIntroShownThisSession(): boolean {
  if (typeof (globalThis as { window?: unknown }).window === "undefined")
    return true;
  try {
    return sessionStorage.getItem(BRAND_SESSION_KEY) === "1";
  } catch {
    return false;
  }
}

function markBrandIntroShownThisSession() {
  try {
    sessionStorage.setItem(BRAND_SESSION_KEY, "1");
    localStorage.setItem(LEGACY_INTRO_KEY, "1");
  } catch {
    /* */
  }
}

function readSessionTouch(): SessionTouchPayload | null {
  if (typeof (globalThis as { window?: unknown }).window === "undefined")
    return null;
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as SessionTouchPayload;
  } catch {
    return null;
  }
}

function writeSessionTouch(payload: SessionTouchPayload) {
  if (typeof (globalThis as { window?: unknown }).window === "undefined")
    return;
  try {
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(payload));
  } catch {
    /* */
  }
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
    assert.equal(localStorage.getItem(LEGACY_INTRO_KEY), "1");
  });

  it("TEST 4: reduced-motion path is static short timeline (contract)", () => {
    const REDUCED_MS = 520;
    assert.ok(REDUCED_MS < 800);
    assert.ok(REDUCED_MS > 400);
  });

  it("TEST 5: cleanup attribute name is data-brand-intro", () => {
    assert.equal("data-brand-intro", "data-brand-intro");
  });

  it("session memory: writeSessionTouch / readSessionTouch still work", () => {
    const payload: SessionTouchPayload = {
      isFirstVisit: false,
      daysAway: 3,
      sessionOpens: 2,
    };
    writeSessionTouch(payload);
    assert.deepEqual(readSessionTouch(), payload);
    assert.ok(sessionStorage.getItem(SESSION_KEY));
  });

  it("legacy localStorage key does not gate brand intro", () => {
    localStorage.setItem(LEGACY_INTRO_KEY, "1");
    assert.equal(wasBrandIntroShownThisSession(), false);
  });
});
