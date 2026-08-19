/**
 * Loading Theatre — one vocabulary for contextual waits (master plan · Sprint 14).
 * UI components share this copy; the global overlay uses the same strings.
 */

export const LOADING_COPY = {
  default: "Tuning the frequency…",
  search: "Scanning the catalogue…",
  recommendations: "Reading your signal…",
  radar: "Scanning the horizon…",
  oracle: "Tuning the desk…",
  ai: "Lantern is thinking…",
  ancestry: "Tracing connections…",
  sauce: "Tracing the frame…",
  challenge: "Drawing a challenge…",
  fusion: "Weaving the signal…",
  browse: "Scanning the catalogue…",
  detail: "Opening the dossier…",
} as const;

export type LoadingContext = keyof typeof LOADING_COPY;

export function loadingLabel(
  context?: LoadingContext | string | null,
): string {
  if (!context) return LOADING_COPY.default;
  if (context in LOADING_COPY) {
    return LOADING_COPY[context as LoadingContext];
  }
  return context;
}
