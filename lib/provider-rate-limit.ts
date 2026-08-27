/**
 * Provider rate-limit awareness + light circuit breaker (Multi-API Sprint 4).
 * Process-local only — not a distributed limiter.
 */

export type RateLimitConfig = {
  /** Min ms between outbound calls for this provider */
  minIntervalMs: number;
  /** Failures in window before open circuit */
  maxFailures: number;
  /** Circuit open duration */
  coolDownMs: number;
};

const DEFAULTS: Record<string, RateLimitConfig> = {
  anilist: { minIntervalMs: 80, maxFailures: 8, coolDownMs: 30_000 },
  jikan: { minIntervalMs: 350, maxFailures: 5, coolDownMs: 60_000 },
  kitsu: { minIntervalMs: 100, maxFailures: 6, coolDownMs: 30_000 },
  shikimori: { minIntervalMs: 120, maxFailures: 6, coolDownMs: 30_000 },
  animethemes: { minIntervalMs: 150, maxFailures: 5, coolDownMs: 45_000 },
  "trace.moe": { minIntervalMs: 500, maxFailures: 4, coolDownMs: 60_000 },
  animeschedule: { minIntervalMs: 200, maxFailures: 5, coolDownMs: 45_000 },
  aniskip: { minIntervalMs: 100, maxFailures: 5, coolDownMs: 30_000 },
  tmdb: { minIntervalMs: 120, maxFailures: 5, coolDownMs: 45_000 },
  musicbrainz: { minIntervalMs: 1100, maxFailures: 3, coolDownMs: 90_000 },
  youtube: { minIntervalMs: 200, maxFailures: 4, coolDownMs: 60_000 },
  wikidata: { minIntervalMs: 500, maxFailures: 4, coolDownMs: 60_000 },
  watchmode: { minIntervalMs: 250, maxFailures: 4, coolDownMs: 120_000 },
  anidb: { minIntervalMs: 2200, maxFailures: 3, coolDownMs: 120_000 },
  "anidb-titles": { minIntervalMs: 5000, maxFailures: 2, coolDownMs: 300_000 },
  simkl: { minIntervalMs: 200, maxFailures: 5, coolDownMs: 60_000 },
  fanart: { minIntervalMs: 300, maxFailures: 4, coolDownMs: 90_000 },
};

type ProviderState = {
  lastCallAt: number;
  failures: number;
  circuitOpenUntil: number;
};

const state = new Map<string, ProviderState>();

function getState(provider: string): ProviderState {
  let s = state.get(provider);
  if (!s) {
    s = { lastCallAt: 0, failures: 0, circuitOpenUntil: 0 };
    state.set(provider, s);
  }
  return s;
}

function configFor(provider: string): RateLimitConfig {
  return DEFAULTS[provider] || {
    minIntervalMs: 150,
    maxFailures: 6,
    coolDownMs: 30_000,
  };
}

export function isCircuitOpen(provider: string): boolean {
  const s = getState(provider);
  if (s.circuitOpenUntil && Date.now() < s.circuitOpenUntil) return true;
  if (s.circuitOpenUntil && Date.now() >= s.circuitOpenUntil) {
    s.circuitOpenUntil = 0;
    s.failures = 0;
  }
  return false;
}

/** Wait until min interval elapsed; throws if circuit open. */
export async function acquireProviderSlot(provider: string): Promise<void> {
  if (isCircuitOpen(provider)) {
    throw new Error(`[rate-limit] ${provider} circuit open`);
  }
  const cfg = configFor(provider);
  const s = getState(provider);
  const wait = s.lastCallAt + cfg.minIntervalMs - Date.now();
  if (wait > 0) {
    await new Promise((r) => setTimeout(r, wait));
  }
  s.lastCallAt = Date.now();
}

export function recordProviderSuccess(provider: string): void {
  const s = getState(provider);
  s.failures = 0;
}

export function recordProviderFailure(provider: string): void {
  const s = getState(provider);
  const cfg = configFor(provider);
  s.failures += 1;
  if (s.failures >= cfg.maxFailures) {
    s.circuitOpenUntil = Date.now() + cfg.coolDownMs;
    s.failures = 0;
    console.warn(
      `[rate-limit] ${provider} circuit open for ${cfg.coolDownMs}ms`,
    );
  }
}

export type ProviderHealthSnapshot = {
  provider: string;
  circuitOpen: boolean;
  failures: number;
  lastCallAt: number;
};

export function getProviderHealth(): ProviderHealthSnapshot[] {
  const out: ProviderHealthSnapshot[] = [];
  for (const [provider, s] of state) {
    out.push({
      provider,
      circuitOpen: isCircuitOpen(provider),
      failures: s.failures,
      lastCallAt: s.lastCallAt,
    });
  }
  return out;
}

/** Run fn under rate-limit + success/failure bookkeeping. */
export async function withProviderLimit<T>(
  provider: string,
  fn: () => Promise<T>,
): Promise<T> {
  await acquireProviderSlot(provider);
  try {
    const result = await fn();
    recordProviderSuccess(provider);
    return result;
  } catch (e) {
    recordProviderFailure(provider);
    throw e;
  }
}
