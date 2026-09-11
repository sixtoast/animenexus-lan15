/**
 * Offline mood seeding (curated lists + static catalog).
 *
 * Default: enabled (site never blank when APIs are down).
 * Disable via:
 *   - env MOOD_OFFLINE_SEED=0 | false | off
 *   - or getMoodCandidates({ allowOfflineSeed: false })
 *   - or mood URL ?offline=0
 */

function parseFlag(raw: string | undefined | null): boolean | null {
  if (raw == null || raw === "") return null;
  const v = String(raw).trim().toLowerCase();
  if (["0", "false", "off", "no", "disabled"].includes(v)) return false;
  if (["1", "true", "on", "yes", "enabled"].includes(v)) return true;
  return null;
}

/** Server env default (Vercel / .env). Missing → enabled. */
export function isMoodOfflineSeedEnabledByEnv(): boolean {
  const fromEnv = parseFlag(process.env.MOOD_OFFLINE_SEED);
  if (fromEnv != null) return fromEnv;
  const legacy = parseFlag(process.env.DISABLE_MOOD_OFFLINE_SEED);
  if (legacy === true) return false; // DISABLE=1 means off
  if (legacy === false) return true;
  return true;
}

/** Resolve final flag: explicit opt overrides env. */
export function resolveMoodOfflineSeed(
  allowOfflineSeed?: boolean,
): boolean {
  if (typeof allowOfflineSeed === "boolean") return allowOfflineSeed;
  return isMoodOfflineSeedEnabledByEnv();
}

export function offlineSeedDisabledReason(): string {
  return "Offline seeding disabled (MOOD_OFFLINE_SEED / ?offline=0)";
}
