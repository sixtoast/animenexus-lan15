/**
 * Ensure ranker uses V3 fingerprintIntentFit + explicit intent weights.
 */
const fs = require("fs");
const path = require("path");

const file = path.join(
  process.cwd(),
  "lib/intelligence/recommendation/ranker-v3.ts",
);

function main() {
  if (!fs.existsSync(file)) return;
  let t = fs.readFileSync(file, "utf8");
  let changed = false;

  if (!t.includes("fingerprintIntentFit")) {
    t = t.replace(
      'import { getExperienceIntent } from "@/lib/viewing-intent";',
      `import {
  getExperienceIntent,
  fingerprintIntentFit,
} from "@/lib/viewing-intent";`,
    );
    changed = true;
  }

  if (!t.includes("RANKER_V3_EXPLICIT_INTENT_WEIGHTS")) {
    t = t.replace(
      "} as const;\n\nexport type MatchSignal",
      `} as const;

export const RANKER_V3_EXPLICIT_INTENT_WEIGHTS = {
  stableTaste: 0.13,
  activeCluster: 0.08,
  emergingTaste: 0.06,
  viewingIntent: 0.36,
  fingerprint: 0.09,
  sourceAgreement: 0.06,
  completionLikelihood: 0.1,
  communityQuality: 0.05,
  availability: 0.03,
  fatigue: 0.08,
  dropRisk: 0.08,
} as const;

export type MatchSignal`,
    );
    changed = true;
  }

  if (t.includes("id: -10") || !t.includes("fingerprintIntentFit(fp, exp")) {
    const start = t.indexOf("let intentSim = stableSim * 0.85;");
    const end = t.indexOf("const fpSim", start);
    if (start >= 0 && end > start) {
      t =
        t.slice(0, start) +
        `let intentSim = stableSim * 0.85;
    if (exp) {
      intentSim =
        exp.slug === "surprise"
          ? 0.5
          : fingerprintIntentFit(fp, exp, session);
    }

    ` +
        t.slice(end);
      changed = true;
    }
  }

  if (!t.includes("const session =") || !t.includes("const W =")) {
    const marker = "  const exp = slug ? getExperienceIntent(slug) : undefined;";
    if (t.includes(marker) && !t.includes("const session =")) {
      t = t.replace(
        marker,
        `  const exp = slug ? getExperienceIntent(slug) : undefined;
  const session =
    typeof window !== "undefined" ? readIntentSession() : null;
  const W =
    exp && exp.slug !== "surprise"
      ? RANKER_V3_EXPLICIT_INTENT_WEIGHTS
      : RANKER_V3_WEIGHTS;`,
      );
      changed = true;
    }
  }

  t = t.replace(/\n  const W = RANKER_V3_WEIGHTS;\n/, "\n");

  if (changed) {
    fs.writeFileSync(file, t);
    console.log("[patch-ranker] patched", file);
  } else {
    console.log("[patch-ranker] already fixed");
  }
}

try {
  main();
} catch (e) {
  console.error("[patch-ranker]", e.message);
}
