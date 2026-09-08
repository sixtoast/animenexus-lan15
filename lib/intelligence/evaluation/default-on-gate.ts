/**
 * Criteria for enabling Recommendation Intelligence V3 by default.
 * Offline synthetic eval alone is not sufficient — lab + real outcomes required.
 */

export const DEFAULT_ON_GATE_VERSION = "gate_v1";

export type EngineMeans = {
  engine: string;
  recallAt5: number;
  ndcgAt5: number;
  mrr: number;
};

export type GateResult = {
  version: string;
  offlinePass: boolean;
  reasons: string[];
  /** Never auto-flip production default from offline alone */
  allowProductionDefault: boolean;
};

export function evaluateOfflineGate(
  means: EngineMeans[],
  opts?: { tagEngine?: string; v3Engine?: string },
): GateResult {
  const tagName = opts?.tagEngine ?? "tag";
  const v3Name = opts?.v3Engine ?? "v3_blend";
  const tag = means.find((m) => m.engine === tagName);
  const v3 = means.find((m) => m.engine === v3Name);
  const reasons: string[] = [];

  if (!tag || !v3) {
    return {
      version: DEFAULT_ON_GATE_VERSION,
      offlinePass: false,
      reasons: ["Missing tag or v3 engine means"],
      allowProductionDefault: false,
    };
  }

  const competitive =
    v3.recallAt5 >= tag.recallAt5 - 0.02 &&
    (v3.ndcgAt5 > tag.ndcgAt5 + 0.02 ||
      v3.mrr > tag.mrr + 0.02 ||
      v3.recallAt5 > tag.recallAt5 + 0.03);

  if (competitive) {
    reasons.push("Offline multi-signal competitive with tag baseline");
  } else {
    reasons.push("Offline multi-signal does not beat tag baseline enough");
  }

  reasons.push(
    "Production default requires lab V2 vs V3 sign-off + real outcome window",
  );

  return {
    version: DEFAULT_ON_GATE_VERSION,
    offlinePass: competitive,
    reasons,
    allowProductionDefault: false,
  };
}
