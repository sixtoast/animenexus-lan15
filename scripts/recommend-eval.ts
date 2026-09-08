/**
 * Offline recommendation evaluation CLI (no Next runtime).
 * Usage: npm run recommend:eval
 */

import {
  SYNTHETIC_PERSONAS,
  EVAL_CATALOGUE,
  catalogueAsEntries,
  type SyntheticPersona,
} from "../lib/intelligence/evaluation/personas.ts";
import {
  recallAtK,
  ndcgAtK,
  mrr,
  intraListDiversity,
  catalogueCoverage,
  completionWeightedHitRate,
  meanAbsoluteCalibrationError,
  type RankedId,
} from "../lib/intelligence/evaluation/metrics.ts";
import type { WatchlistEntry } from "../lib/types.ts";

type Cand = {
  id: number;
  title: string;
  tags: string[];
  score: number;
};

function tagsOf(e: WatchlistEntry): string[] {
  const out = [...(e.genres || []), ...(e.tags || [])].map((t) =>
    String(t).toLowerCase(),
  );
  return [...new Set(out.filter(Boolean))];
}

function entryCand(e: WatchlistEntry): Cand {
  return {
    id: e.id,
    title: e.title,
    tags: tagsOf(e),
    score: typeof e.score === "number" ? e.score : 70,
  };
}

function rankTagOverlap(pool: Cand[], train: WatchlistEntry[]): RankedId[] {
  const bag = new Map<string, number>();
  for (const e of train) {
    const w =
      e.watchStatus === "completed"
        ? 1.2
        : e.watchStatus === "dropped"
          ? 0.3
          : 0.6;
    for (const t of tagsOf(e)) bag.set(t, (bag.get(t) || 0) + w);
  }
  const ranked = pool.map((c) => {
    let inter = 0;
    const union = c.tags.length;
    for (const t of c.tags) {
      if (bag.has(t)) inter += bag.get(t)!;
    }
    const denom = Math.max(1, union + bag.size / 4);
    return { id: c.id, score: inter / denom };
  });
  ranked.sort((a, b) => b.score - a.score);
  return ranked;
}

const SIGNAL: Record<string, number> = {
  psychological: 1.2,
  mystery: 1.1,
  thriller: 1.0,
  romance: 1.0,
  comedy: 0.9,
  drama: 0.9,
  action: 0.85,
  "slice of life": 0.95,
  horror: 1.0,
  fantasy: 0.8,
  "sci-fi": 0.85,
};

function rankEvidenceProxy(pool: Cand[], train: WatchlistEntry[]): RankedId[] {
  const pref = new Map<string, number>();
  for (const e of train) {
    if (e.watchStatus === "dropped") continue;
    const w = e.watchStatus === "completed" ? 1.4 : 0.7;
    for (const t of tagsOf(e)) {
      const boost = SIGNAL[t] ?? 0.6;
      pref.set(t, (pref.get(t) || 0) + w * boost);
    }
  }
  const ranked = pool.map((c) => {
    let s = 0;
    for (const t of c.tags) s += pref.get(t) || 0;
    s += (c.score || 0) / 200;
    return { id: c.id, score: s };
  });
  ranked.sort((a, b) => b.score - a.score);
  return ranked;
}

function rankFingerprintProxy(pool: Cand[], train: WatchlistEntry[]): RankedId[] {
  const pref = new Map<string, number>();
  let completedN = 0;
  for (const e of train) {
    const status = e.watchStatus;
    let w = 0.5;
    if (status === "completed") {
      w = 1.5;
      completedN++;
    } else if (status === "watching") w = 0.9;
    else if (status === "dropped") w = -0.4;
    else if (status === "planning") w = 0.25;
    for (const t of tagsOf(e)) {
      const boost = SIGNAL[t] ?? 0.55;
      pref.set(t, (pref.get(t) || 0) + w * boost);
    }
  }
  const ranked = pool.map((c) => {
    let s = 0;
    for (const t of c.tags) s += pref.get(t) || 0;
    s += (c.score || 0) / 180;
    if (completedN < 2) s *= 0.85;
    return { id: c.id, score: s };
  });
  ranked.sort((a, b) => b.score - a.score);
  return ranked;
}

function rankV3Blend(pool: Cand[], train: WatchlistEntry[]): RankedId[] {
  const tag = new Map(rankTagOverlap(pool, train).map((r) => [r.id, r.score]));
  const ev = new Map(rankEvidenceProxy(pool, train).map((r) => [r.id, r.score]));
  const fp = new Map(rankFingerprintProxy(pool, train).map((r) => [r.id, r.score]));
  const max = (m: Map<number, number>) => Math.max(1e-6, ...m.values());
  const mt = max(tag);
  const me = max(ev);
  const mf = max(fp);
  const done = new Map<string, number>();
  const drop = new Map<string, number>();
  for (const e of train) {
    for (const t of tagsOf(e)) {
      if (e.watchStatus === "completed") done.set(t, (done.get(t) || 0) + 1);
      if (e.watchStatus === "dropped") drop.set(t, (drop.get(t) || 0) + 1);
    }
  }
  const ranked = pool.map((c) => {
    const t = (tag.get(c.id) || 0) / mt;
    const e = (ev.get(c.id) || 0) / me;
    const f = (fp.get(c.id) || 0) / mf;
    let completion = 0.5;
    let n = 0;
    for (const tg of c.tags) {
      const d = done.get(tg) || 0;
      const x = drop.get(tg) || 0;
      if (d + x > 0) {
        completion += d / (d + x);
        n++;
      }
    }
    if (n) completion = completion / (n + 1);
    const score = t * 0.35 + e * 0.25 + f * 0.25 + completion * 0.15;
    return { id: c.id, score };
  });
  ranked.sort((a, b) => b.score - a.score);
  return ranked;
}

function chronologicalSplit(persona: SyntheticPersona): {
  train: WatchlistEntry[];
  holdout: WatchlistEntry[];
  pool: Cand[];
} {
  const completed = persona.entries
    .filter((e) => e.watchStatus === "completed")
    .slice()
    .sort(
      (a, b) =>
        new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime(),
    );

  if (completed.length < 2) {
    return {
      train: persona.entries,
      holdout: [],
      pool: persona.entries.map(entryCand),
    };
  }

  const holdCount = Math.max(
    1,
    Math.min(3, Math.max(1, Math.floor(completed.length / 3))),
  );
  const holdout = completed.slice(-holdCount);
  const holdIds = new Set(holdout.map((h) => h.id));
  const train = persona.entries.filter((e) => !holdIds.has(e.id));

  const poolMap = new Map<number, Cand>();
  for (const e of persona.entries) poolMap.set(e.id, entryCand(e));
  for (const e of catalogueAsEntries()) {
    if (!poolMap.has(e.id)) poolMap.set(e.id, entryCand(e));
  }
  for (const other of SYNTHETIC_PERSONAS) {
    if (other.id === persona.id) continue;
    for (const e of other.entries) {
      if (!poolMap.has(e.id)) poolMap.set(e.id, entryCand(e));
    }
  }

  return { train, holdout, pool: [...poolMap.values()] };
}

type Row = {
  persona: string;
  engine: string;
  recall5: number;
  ndcg5: number;
  mrr: number;
  diversity: number;
  coverage: number;
  completionHit: number;
};

function mean(xs: number[]): number {
  return xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0;
}

function main() {
  console.log("AnimeNexus · recommend:eval");
  console.log("═".repeat(56));

  console.log("\n▸ Personas");
  for (const p of SYNTHETIC_PERSONAS) {
    const n = p.entries.length;
    const done = p.entries.filter((e) => e.watchStatus === "completed").length;
    console.log(
      `  ${p.label.padEnd(28)} n=${String(n).padStart(2)}  completed=${done}`,
    );
  }

  console.log("\n▸ Chronological leave-last (synthetic)");
  const rows: Row[] = [];

  for (const persona of SYNTHETIC_PERSONAS) {
    const { train, holdout, pool } = chronologicalSplit(persona);
    if (!holdout.length) continue;
    const relevant = new Set(holdout.map((h) => h.id));
    const trainIds = new Set(train.map((t) => t.id));
    const poolOpen = pool.filter(
      (c) => !trainIds.has(c.id) || relevant.has(c.id),
    );

    for (const [engine, rankFn] of [
      ["tag", rankTagOverlap],
      ["evidence", rankEvidenceProxy],
      ["fp_proxy", rankFingerprintProxy],
      ["v3_blend", rankV3Blend],
    ] as const) {
      const ranked = rankFn(poolOpen, train);
      const candById = new Map(pool.map((c) => [c.id, c]));
      const topItems = ranked.slice(0, 10).map((r) => ({
        id: r.id,
        tags: candById.get(r.id)?.tags || [],
      }));

      rows.push({
        persona: persona.id,
        engine,
        recall5: recallAtK(ranked, relevant, 5),
        ndcg5: ndcgAtK(ranked, relevant, 5),
        mrr: mrr(ranked, relevant),
        diversity: intraListDiversity(topItems, 10),
        coverage: catalogueCoverage(ranked, poolOpen.length, 20),
        completionHit: completionWeightedHitRate(ranked, relevant, 10),
      });
    }
  }

  if (!rows.length) {
    console.log("  No holdout rows.");
  } else {
    const header =
      "persona".padEnd(24) +
      "eng".padEnd(10) +
      "R@5".padStart(7) +
      "nDCG5".padStart(8) +
      "MRR".padStart(7) +
      "div".padStart(7) +
      "cov".padStart(7) +
      "comp".padStart(7);
    console.log(header);
    console.log("-".repeat(header.length));
    for (const r of rows) {
      console.log(
        r.persona.padEnd(24) +
          r.engine.padEnd(10) +
          r.recall5.toFixed(2).padStart(7) +
          r.ndcg5.toFixed(2).padStart(8) +
          r.mrr.toFixed(2).padStart(7) +
          r.diversity.toFixed(2).padStart(7) +
          r.coverage.toFixed(2).padStart(7) +
          r.completionHit.toFixed(2).padStart(7),
      );
    }

    for (const eng of ["tag", "evidence", "fp_proxy", "v3_blend"] as const) {
      const set = rows.filter((r) => r.engine === eng);
      console.log(
        `  mean ${eng}: R@5=${mean(set.map((r) => r.recall5)).toFixed(3)}  nDCG@5=${mean(set.map((r) => r.ndcg5)).toFixed(3)}  MRR=${mean(set.map((r) => r.mrr)).toFixed(3)}`,
      );
    }
  }

  const calib = meanAbsoluteCalibrationError([
    { predicted: 0.9, outcome: 1 },
    { predicted: 0.2, outcome: 0 },
  ]);
  console.log(`\n▸ Calibration MAE smoke: ${calib.toFixed(3)}`);

  const byEng = (eng: string) => rows.filter((r) => r.engine === eng);
  const meanR = (eng: string) => mean(byEng(eng).map((r) => r.recall5));
  const meanN = (eng: string) => mean(byEng(eng).map((r) => r.ndcg5));
  const meanM = (eng: string) => mean(byEng(eng).map((r) => r.mrr));
  if (rows.length) {
    const tagR = meanR("tag");
    const v3R = meanR("v3_blend");
    const tagN = meanN("tag");
    const v3N = meanN("v3_blend");
    const tagM = meanM("tag");
    const v3M = meanM("v3_blend");
    const wins =
      v3R >= tagR - 0.02 &&
      (v3N > tagN + 0.02 || v3M > tagM + 0.02 || v3R > tagR + 0.03);
    console.log("\n▸ Default-on gate (synthetic offline)");
    console.log(
      `  tag  R@5=${tagR.toFixed(3)} nDCG=${tagN.toFixed(3)} MRR=${tagM.toFixed(3)}`,
    );
    console.log(
      `  v3   R@5=${v3R.toFixed(3)} nDCG=${v3N.toFixed(3)} MRR=${v3M.toFixed(3)}`,
    );
    console.log(
      wins
        ? "  RESULT: PASS — multi-signal competitive; lab forceVersion compare still required before production default."
        : "  RESULT: HOLD — keep V3 opt-in; expand catalogue / real outcomes before default-on.",
    );
  }

  console.log(
    "\nNote: v3_blend ≈ offline multi-signal stand-in. Full ranker_v3 → /dev/recommendation-lab",
  );
  console.log(
    `Catalogue seeds: ${EVAL_CATALOGUE.length}. Personas: ${SYNTHETIC_PERSONAS.length}.`,
  );
  console.log("Done.");
}

main();
