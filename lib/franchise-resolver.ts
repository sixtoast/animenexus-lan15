/**
 * Franchise intelligence (API Expansion II Sprint 9).
 * Answers "what order should I watch?" without pretending there is always
 * one objective order. Paths are derived from relation evidence only.
 */

import type { MergedRelation } from "./relation-merge";
import { normalizeRelationType } from "./relation-merge";

export type FranchiseNode = {
  /** AniList id when known */
  id?: number;
  externalId?: string;
  title: string;
  year?: number;
  format?: string;
  relationFromCenter?: string;
};

export type FranchisePath = {
  id: "release" | "chronological" | "main_story" | "completion";
  label: string;
  nodes: FranchiseNode[];
  /** When relation graph is thin or contradictory */
  uncertain: boolean;
  note?: string;
};

export type FranchisePlan = {
  center: FranchiseNode;
  paths: FranchisePath[];
  relationCount: number;
  sources: string[];
};

const MAIN_EDGE = new Set([
  "SEQUEL",
  "PREQUEL",
  "PARENT",
  "FULL_STORY",
  "SUMMARY",
]);

const SIDE_EDGE = new Set([
  "SIDE_STORY",
  "SPIN_OFF",
  "ALTERNATIVE",
  "OTHER",
  "CHARACTER",
]);

function nodeKey(n: FranchiseNode): string {
  if (n.id != null) return `al:${n.id}`;
  if (n.externalId) return `ext:${n.externalId}`;
  return `t:${n.title.toLowerCase()}`;
}

/** Build a plan from center + merged relations (AniList primary links). */
export function resolveFranchise(opts: {
  center: FranchiseNode;
  relations: MergedRelation[];
  /** Optional year/title enrichment keyed by anilist id */
  enrich?: Record<number, Partial<FranchiseNode>>;
}): FranchisePlan {
  const { center, relations, enrich = {} } = opts;
  const sources = new Set<string>();
  for (const r of relations) {
    for (const s of r.sources) sources.add(s);
  }

  const related: FranchiseNode[] = [];
  for (const r of relations) {
    if (r.targetAnimeId != null) {
      const extra = enrich[r.targetAnimeId] || {};
      related.push({
        id: r.targetAnimeId,
        title: r.title || extra.title || `Title #${r.targetAnimeId}`,
        year: extra.year,
        format: extra.format,
        relationFromCenter: normalizeRelationType(r.relationType),
      });
    } else if (r.externalTargetId) {
      related.push({
        externalId: `${r.externalTargetSource || "ext"}:${r.externalTargetId}`,
        title: r.title || `External ${r.externalTargetId}`,
        relationFromCenter: normalizeRelationType(r.relationType),
      });
    }
  }

  const thin = related.length < 2;
  const paths: FranchisePath[] = [];

  // Release order: center + related sorted by year when known
  const releaseNodes = dedupeNodes([center, ...related]).sort((a, b) => {
    const ya = a.year ?? 9999;
    const yb = b.year ?? 9999;
    if (ya !== yb) return ya - yb;
    return (a.title || "").localeCompare(b.title || "");
  });
  const releaseUncertain =
    thin || releaseNodes.filter((n) => n.year != null).length < 2;
  paths.push({
    id: "release",
    label: "Release order",
    nodes: releaseNodes,
    uncertain: releaseUncertain,
    note: releaseUncertain
      ? "Year data incomplete — order is approximate."
      : undefined,
  });

  // Chronological: prequels before center, sequels after (when typed)
  const prequels = related.filter(
    (n) => n.relationFromCenter === "PREQUEL",
  );
  const sequels = related.filter(
    (n) => n.relationFromCenter === "SEQUEL",
  );
  const chrono = dedupeNodes([...prequels, center, ...sequels]);
  const chronoUncertain =
    thin || (prequels.length === 0 && sequels.length === 0);
  paths.push({
    id: "chronological",
    label: "Story order (prequel → sequel)",
    nodes: chrono,
    uncertain: chronoUncertain,
    note: chronoUncertain
      ? "Few prequel/sequel links — chronological path is incomplete."
      : undefined,
  });

  // Main story only: center + MAIN_EDGE relations
  const main = dedupeNodes([
    center,
    ...related.filter(
      (n) =>
        n.relationFromCenter != null &&
        MAIN_EDGE.has(n.relationFromCenter),
    ),
  ]);
  paths.push({
    id: "main_story",
    label: "Main story path",
    nodes: main,
    uncertain: main.length <= 1,
    note:
      main.length <= 1
        ? "No clear main-line sequels/prequels from providers."
        : "Side stories and alternatives excluded.",
  });

  // Completion: everything we know about
  const completion = dedupeNodes([center, ...related]);
  paths.push({
    id: "completion",
    label: "Full completion path",
    nodes: completion,
    uncertain: thin,
    note: thin
      ? "Limited relation data — franchise may be larger than shown."
      : "Includes side stories and alternatives when linked.",
  });

  return {
    center,
    paths,
    relationCount: relations.length,
    sources: [...sources],
  };
}

function dedupeNodes(nodes: FranchiseNode[]): FranchiseNode[] {
  const seen = new Set<string>();
  const out: FranchiseNode[] = [];
  for (const n of nodes) {
    const k = nodeKey(n);
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(n);
  }
  return out;
}

/** Short UI blurb for Radar / Detail. */
export function franchiseSummaryLine(plan: FranchisePlan): string {
  const main = plan.paths.find((p) => p.id === "main_story");
  if (!main || main.nodes.length <= 1) {
    return "Franchise order is unclear from available relations.";
  }
  const titles = main.nodes
    .slice(0, 4)
    .map((n) => n.title)
    .join(" → ");
  const more = main.nodes.length > 4 ? " → …" : "";
  const hedge = main.uncertain ? " (approximate)" : "";
  return `Main path${hedge}: ${titles}${more}`;
}
