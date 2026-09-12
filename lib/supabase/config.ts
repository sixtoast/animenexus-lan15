/**
 * Central Supabase URL configuration.
 * Expects NEXT_PUBLIC_SUPABASE_URL = project origin only, e.g.
 * https://xxxx.supabase.co
 *
 * Rejects dashboard copy-paste like:
 * Your project URL is: `https://xxxx.supabase.co`
 */

const SUPABASE_HOST_SUFFIX = ".supabase.co";

/**
 * Validate and normalise a Supabase project URL to its origin.
 * Throws on missing or malformed values (including explanatory prose).
 */
export function validateSupabaseUrl(value: string | undefined): string {
  if (value == null || String(value).trim() === "") {
    throw new Error("Supabase project URL is missing.");
  }

  const trimmed = String(value).trim();

  // Explicitly reject dashboard prose / markdown (do not extract URL from it).
  if (
    /your project url is/i.test(trimmed) ||
    trimmed.includes("`") ||
    /\n|\r/.test(trimmed)
  ) {
    throw new Error(
      "Invalid Supabase project URL configuration. Set NEXT_PUBLIC_SUPABASE_URL to the bare origin only (https://YOUR_REF.supabase.co), not dashboard instructions or Markdown.",
    );
  }

  let url: URL;
  try {
    url = new URL(trimmed);
  } catch {
    throw new Error("Invalid Supabase project URL configuration.");
  }

  if (url.protocol !== "https:") {
    throw new Error("Invalid Supabase project URL configuration.");
  }

  if (!url.hostname.endsWith(SUPABASE_HOST_SUFFIX)) {
    throw new Error("Invalid Supabase project URL configuration.");
  }

  // Path must be empty or "/" — client appends /rest/v1/ itself.
  if (url.pathname && url.pathname !== "/") {
    throw new Error(
      "Invalid Supabase project URL configuration. Use the project origin only; do not include /rest/v1/.",
    );
  }

  return url.origin;
}

/**
 * Read NEXT_PUBLIC_SUPABASE_URL.
 * - unset/empty → null (feature soft-disabled)
 * - set but invalid → throws (misconfiguration must not be silent)
 */
export function getSupabaseProjectUrl(): string | null {
  const raw = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (raw == null || String(raw).trim() === "") return null;
  return validateSupabaseUrl(raw);
}

export function isSupabaseUrlConfigured(): boolean {
  try {
    return getSupabaseProjectUrl() != null;
  } catch {
    return false;
  }
}

/** Safe diagnostics — never logs keys. */
export function supabaseUrlDiagnostics(): {
  configured: boolean;
  valid: boolean;
  hostname: string | null;
  error?: string;
} {
  const raw = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (raw == null || String(raw).trim() === "") {
    return { configured: false, valid: false, hostname: null };
  }
  try {
    const origin = validateSupabaseUrl(raw);
    return {
      configured: true,
      valid: true,
      hostname: new URL(origin).hostname,
    };
  } catch (e) {
    return {
      configured: true,
      valid: false,
      hostname: null,
      error: e instanceof Error ? e.message : "invalid",
    };
  }
}
