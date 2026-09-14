import type { ProviderEvidenceBundle } from "./types";
import { EVIDENCE_SCHEMA_VERSION } from "./types";

const g = globalThis as unknown as {
  __an_evidence_bundle_cache?: Map<
    string,
    { at: number; bundle: ProviderEvidenceBundle }
  >;
};

function store() {
  if (!g.__an_evidence_bundle_cache) {
    g.__an_evidence_bundle_cache = new Map();
  }
  return g.__an_evidence_bundle_cache;
}

const TTL_MS = 1000 * 60 * 60 * 6;
const STALE_MS = 1000 * 60 * 60 * 24 * 7;

export function cacheKeyForIdentity(
  malId?: number | null,
  anilistId?: number | null,
  nexusId?: string | null,
): string {
  if (nexusId) return `nx:${nexusId}|v:${EVIDENCE_SCHEMA_VERSION}`;
  return `mal:${malId || 0}|al:${anilistId || 0}|v:${EVIDENCE_SCHEMA_VERSION}`;
}

export function getEvidenceBundle(
  malId?: number | null,
  anilistId?: number | null,
  nexusId?: string | null,
): ProviderEvidenceBundle | null {
  const key = cacheKeyForIdentity(malId, anilistId, nexusId);
  const hit = store().get(key);
  if (!hit) return null;
  if (Date.now() - hit.at > TTL_MS) return null;
  return hit.bundle;
}

export function getStaleEvidenceBundle(
  malId?: number | null,
  anilistId?: number | null,
  nexusId?: string | null,
): ProviderEvidenceBundle | null {
  const key = cacheKeyForIdentity(malId, anilistId, nexusId);
  const hit = store().get(key);
  if (!hit) return null;
  const age = Date.now() - hit.at;
  if (age <= STALE_MS) return hit.bundle;
  store().delete(key);
  return null;
}

export function setEvidenceBundle(bundle: ProviderEvidenceBundle): void {
  const key = cacheKeyForIdentity(
    bundle.identity.malId,
    bundle.identity.anilistId,
  );
  store().set(key, { at: Date.now(), bundle });
}
