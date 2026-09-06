/**
 * Offline ranking metrics for chronological evaluation.
 */

export type RankedId = { id: number; score: number };

export function recallAtK(
  ranked: RankedId[],
  relevant: Set<number>,
  k: number,
): number {
  if (relevant.size === 0) return 0;
  const top = ranked.slice(0, k).map((r) => r.id);
  let hits = 0;
  for (const id of top) if (relevant.has(id)) hits++;
  return hits / relevant.size;
}

export function precisionAtK(
  ranked: RankedId[],
  relevant: Set<number>,
  k: number,
): number {
  if (k <= 0) return 0;
  const top = ranked.slice(0, k);
  if (!top.length) return 0;
  let hits = 0;
  for (const r of top) if (relevant.has(r.id)) hits++;
  return hits / top.length;
}

function dcg(ranked: RankedId[], relevant: Set<number>, k: number): number {
  let sum = 0;
  for (let i = 0; i < Math.min(k, ranked.length); i++) {
    const rel = relevant.has(ranked[i]!.id) ? 1 : 0;
    if (rel === 0) continue;
    sum += rel / Math.log2(i + 2);
  }
  return sum;
}

export function ndcgAtK(
  ranked: RankedId[],
  relevant: Set<number>,
  k: number,
): number {
  const actual = dcg(ranked, relevant, k);
  if (actual === 0) return 0;
  const idealList: RankedId[] = [...relevant].map((id) => ({ id, score: 1 }));
  const ideal = dcg(idealList, relevant, k);
  if (ideal === 0) return 0;
  return actual / ideal;
}

export function mrr(ranked: RankedId[], relevant: Set<number>): number {
  for (let i = 0; i < ranked.length; i++) {
    if (relevant.has(ranked[i]!.id)) return 1 / (i + 1);
  }
  return 0;
}

export function intraListDiversity(
  items: { id: number; tags?: string[] }[],
  k = 10,
): number {
  const slice = items.slice(0, k);
  if (slice.length < 2) return 0;
  let pairs = 0;
  let diff = 0;
  for (let i = 0; i < slice.length; i++) {
    for (let j = i + 1; j < slice.length; j++) {
      pairs++;
      const a = new Set((slice[i]!.tags || []).map((t) => t.toLowerCase()));
      const b = (slice[j]!.tags || []).map((t) => t.toLowerCase());
      const overlap = b.some((t) => a.has(t));
      if (!overlap) diff++;
    }
  }
  return pairs ? diff / pairs : 0;
}

/** Fraction of top-K unique relative to catalogue size (coverage proxy). */
export function catalogueCoverage(
  ranked: RankedId[],
  catalogueSize: number,
  k = 20,
): number {
  if (catalogueSize <= 0) return 0;
  const top = ranked.slice(0, k);
  const unique = new Set(top.map((r) => r.id));
  return unique.size / Math.min(k, catalogueSize);
}

/** Mean pairwise tag distance in top-K (alias of intraListDiversity). */
export function noveltyOfList(
  items: { id: number; tags?: string[] }[],
  k = 10,
): number {
  return intraListDiversity(items, k);
}

/** Mean |predicted - outcome| on binary labels. Lower is better. */
export function meanAbsoluteCalibrationError(
  pairs: { predicted: number; outcome: 0 | 1 }[],
): number {
  if (!pairs.length) return 1;
  let sum = 0;
  for (const p of pairs) {
    sum += Math.abs(Math.max(0, Math.min(1, p.predicted)) - p.outcome);
  }
  return sum / pairs.length;
}

/** Share of completed ids recovered in top-K (completion-weighted success). */
export function completionWeightedHitRate(
  ranked: RankedId[],
  completedIds: Set<number>,
  k = 10,
): number {
  if (!completedIds.size) return 0;
  const top = ranked.slice(0, k);
  if (!top.length) return 0;
  let hits = 0;
  for (const r of top) if (completedIds.has(r.id)) hits++;
  return hits / Math.min(k, completedIds.size);
}

export type MetricReport = {
  recall5: number;
  recall10: number;
  recall20: number;
  ndcg5: number;
  ndcg10: number;
  mrr: number;
  diversity10: number;
};

export function computeMetricReport(
  ranked: RankedId[],
  relevant: Set<number>,
  items?: { id: number; tags?: string[] }[],
): MetricReport {
  return {
    recall5: recallAtK(ranked, relevant, 5),
    recall10: recallAtK(ranked, relevant, 10),
    recall20: recallAtK(ranked, relevant, 20),
    ndcg5: ndcgAtK(ranked, relevant, 5),
    ndcg10: ndcgAtK(ranked, relevant, 10),
    mrr: mrr(ranked, relevant),
    diversity10: items ? intraListDiversity(items, 10) : 0,
  };
}

export function formatMetricTable(
  label: string,
  report: MetricReport,
): string {
  return [
    label,
    `  Recall@5   ${report.recall5.toFixed(3)}`,
    `  Recall@10  ${report.recall10.toFixed(3)}`,
    `  Recall@20  ${report.recall20.toFixed(3)}`,
    `  NDCG@5     ${report.ndcg5.toFixed(3)}`,
    `  NDCG@10    ${report.ndcg10.toFixed(3)}`,
    `  MRR        ${report.mrr.toFixed(3)}`,
    `  Diversity  ${report.diversity10.toFixed(3)}`,
  ].join("\n");
}
