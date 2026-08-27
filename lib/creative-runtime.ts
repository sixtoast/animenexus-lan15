/**
 * Creative runtime capability detection (Creative Tech Sprint 1).
 *
 * Chooses FULL | BALANCED | MINIMAL without changing product functionality.
 * Does not rely on user-agent strings as the primary signal.
 *
 * Integrates with existing MotionProvider (`data-reduce-motion`) and
 * prefersReducedMotion() — reduced motion always forces MINIMAL creative extras.
 */

import { prefersReducedMotion } from "./view-transition";

export type CreativeTier = "FULL" | "BALANCED" | "MINIMAL";

export type CreativeCapabilities = {
  canUseWebGL: boolean;
  /** Rive WebGL/Canvas path allowed */
  canUseRive: boolean;
  /** Rich CSS + VT + light Rive/Lottie */
  canUseRichMotion: boolean;
  canUseAudio: boolean;
  reducedMotion: boolean;
  deviceTier: CreativeTier;
  /** Effective creative budget after RM + measurements */
  tier: CreativeTier;
  /** Rough signals for diagnostics */
  signals: {
    hardwareConcurrency: number;
    devicePixelRatio: number;
    viewportMin: number;
    webglRenderer?: string;
    saveData?: boolean;
    measuredFps?: number | null;
  };
};

const STORAGE_TIER_OVERRIDE = "anime_nexus_creative_tier";

let cached: CreativeCapabilities | null = null;
let fpsSample: number | null = null;

function readTierOverride(): CreativeTier | null {
  if (typeof window === "undefined") return null;
  try {
    const v = localStorage.getItem(STORAGE_TIER_OVERRIDE);
    if (v === "FULL" || v === "BALANCED" || v === "MINIMAL") return v;
  } catch {
    /* */
  }
  return null;
}

/** Dev / settings: force tier. Pass null to clear. */
export function setCreativeTierOverride(tier: CreativeTier | null): void {
  if (typeof window === "undefined") return;
  try {
    if (!tier) localStorage.removeItem(STORAGE_TIER_OVERRIDE);
    else localStorage.setItem(STORAGE_TIER_OVERRIDE, tier);
  } catch {
    /* */
  }
  cached = null;
  applyCreativeTierToDocument(detectCreativeCapabilities(true));
}

function probeWebGL(): { ok: boolean; renderer?: string } {
  if (typeof document === "undefined") return { ok: false };
  try {
    const canvas = document.createElement("canvas");
    const gl =
      (canvas.getContext("webgl2") as WebGLRenderingContext | null) ||
      (canvas.getContext("webgl") as WebGLRenderingContext | null) ||
      (canvas.getContext("experimental-webgl") as WebGLRenderingContext | null);
    if (!gl) return { ok: false };
    const dbg = gl.getExtension("WEBGL_debug_renderer_info");
    let renderer: string | undefined;
    if (dbg) {
      renderer = String(gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL) || "");
      // Software renderers → treat as weak WebGL
      if (/swiftshader|llvmpipe|software/i.test(renderer)) {
        return { ok: false, renderer };
      }
    }
    return { ok: true, renderer };
  } catch {
    return { ok: false };
  }
}

function probeAudio(): boolean {
  if (typeof window === "undefined") return false;
  try {
    const AC =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext })
        .webkitAudioContext;
    return Boolean(AC);
  } catch {
    return false;
  }
}

function viewportMin(): number {
  if (typeof window === "undefined") return 1024;
  return Math.min(window.innerWidth || 1024, window.innerHeight || 768);
}

function saveDataEnabled(): boolean {
  if (typeof navigator === "undefined") return false;
  const conn = (navigator as Navigator & {
    connection?: { saveData?: boolean };
  }).connection;
  return Boolean(conn?.saveData);
}

/**
 * Optional short FPS sample (call once after first paint).
 * Conservative: low FPS pulls tier down on next detect.
 */
export function sampleFrameStability(durationMs = 900): void {
  if (typeof window === "undefined" || typeof performance === "undefined") return;
  let frames = 0;
  const start = performance.now();
  let last = start;
  const step = (t: number) => {
    frames += 1;
    last = t;
    if (t - start < durationMs) {
      requestAnimationFrame(step);
    } else {
      const elapsed = (last - start) / 1000;
      fpsSample = elapsed > 0 ? frames / elapsed : null;
      cached = null;
      applyCreativeTierToDocument(detectCreativeCapabilities(true));
    }
  };
  requestAnimationFrame(step);
}

function scoreDeviceTier(signals: {
  canUseWebGL: boolean;
  hardwareConcurrency: number;
  devicePixelRatio: number;
  viewportMin: number;
  saveData: boolean;
  measuredFps: number | null;
}): CreativeTier {
  if (!signals.canUseWebGL) return "MINIMAL";
  if (signals.saveData) return "BALANCED";
  if (signals.viewportMin < 400 && signals.hardwareConcurrency <= 4) {
    return "BALANCED";
  }
  if (signals.measuredFps != null && signals.measuredFps < 28) return "MINIMAL";
  if (signals.measuredFps != null && signals.measuredFps < 45) return "BALANCED";
  // High DPR + low cores → balanced (avoid heavy multi-canvas)
  if (signals.devicePixelRatio >= 3 && signals.hardwareConcurrency <= 4) {
    return "BALANCED";
  }
  if (signals.hardwareConcurrency >= 6 && signals.viewportMin >= 720) {
    return "FULL";
  }
  if (signals.hardwareConcurrency >= 4 && signals.canUseWebGL) return "FULL";
  return "BALANCED";
}

export function detectCreativeCapabilities(
  force = false,
): CreativeCapabilities {
  if (typeof window === "undefined") {
    return {
      canUseWebGL: false,
      canUseRive: false,
      canUseRichMotion: false,
      canUseAudio: false,
      reducedMotion: true,
      deviceTier: "MINIMAL",
      tier: "MINIMAL",
      signals: {
        hardwareConcurrency: 0,
        devicePixelRatio: 1,
        viewportMin: 0,
        measuredFps: null,
      },
    };
  }
  if (cached && !force) return cached;

  const reducedMotion = prefersReducedMotion();
  const webgl = probeWebGL();
  const canUseAudio = probeAudio();
  const hardwareConcurrency =
    typeof navigator !== "undefined" ? navigator.hardwareConcurrency || 2 : 2;
  const devicePixelRatio =
    typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1;
  const vp = viewportMin();
  const saveData = saveDataEnabled();

  const signals = {
    hardwareConcurrency,
    devicePixelRatio,
    viewportMin: vp,
    webglRenderer: webgl.renderer,
    saveData,
    measuredFps: fpsSample,
  };

  const deviceTier = scoreDeviceTier({
    canUseWebGL: webgl.ok,
    hardwareConcurrency,
    devicePixelRatio,
    viewportMin: vp,
    saveData,
    measuredFps: fpsSample,
  });

  const override = readTierOverride();
  let tier: CreativeTier = override || deviceTier;
  if (reducedMotion) tier = "MINIMAL";

  const canUseRichMotion = !reducedMotion && tier !== "MINIMAL";
  const canUseRive =
    !reducedMotion && webgl.ok && (tier === "FULL" || tier === "BALANCED");
  const canUseWebGL = webgl.ok && tier !== "MINIMAL";

  cached = {
    canUseWebGL,
    canUseRive,
    canUseRichMotion,
    canUseAudio: canUseAudio && !reducedMotion,
    reducedMotion,
    deviceTier,
    tier,
    signals,
  };
  return cached;
}

/** Map tier → document hooks for CSS / R3F consumers. */
export function applyCreativeTierToDocument(caps?: CreativeCapabilities): void {
  if (typeof document === "undefined") return;
  const c = caps || detectCreativeCapabilities();
  const root = document.documentElement;
  root.setAttribute("data-creative-tier", c.tier);
  root.setAttribute("data-creative-webgl", c.canUseWebGL ? "1" : "0");
  root.setAttribute("data-creative-rive", c.canUseRive ? "1" : "0");
  root.setAttribute("data-creative-audio", c.canUseAudio ? "1" : "0");
  root.setAttribute("data-creative-rich", c.canUseRichMotion ? "1" : "0");
}

/** Helpers for feature code. */
export function creativeAllowsR3F(): boolean {
  const t = detectCreativeCapabilities().tier;
  return t === "FULL" || t === "BALANCED";
}

export function creativeR3FDprCap(): number {
  const c = detectCreativeCapabilities();
  if (c.tier === "FULL") return Math.min(c.signals.devicePixelRatio, 2);
  if (c.tier === "BALANCED") return Math.min(c.signals.devicePixelRatio, 1.5);
  return 1;
}

export function creativeAllowsRive(): boolean {
  return detectCreativeCapabilities().canUseRive;
}

export function creativeAllowsLottie(): boolean {
  const c = detectCreativeCapabilities();
  return c.canUseRichMotion && c.tier !== "MINIMAL";
}

export function creativeAllowsAudio(): boolean {
  return detectCreativeCapabilities().canUseAudio;
}

/** Invalidate cache (e.g. after motion toggle). */
export function invalidateCreativeRuntime(): void {
  cached = null;
}
