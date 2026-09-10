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

  if (t.includes("fingerprintIntentFit") && !t.includes('from "@/lib/intent-session"')) {
    t = t.replace(
      'from "@/lib/viewing-intent";',
      'from "@/lib/viewing-intent";\nimport { readIntentSession } from "@/lib/intent-session";',
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
    if (start >= 0) {
      const end = t.indexOf("const fpSim = vectorSimilarity", start);
      if (end > start) {
        const replacement = `let intentSim = stableSim * 0.85;
    if (exp) {
      intentSim =
        exp.slug === "surprise"
          ? 0.5
          : fingerprintIntentFit(fp, exp, session);
    }

    `;
        t = t.slice(0, start) + replacement + t.slice(end);
        changed = true;
      }
    }
  }

  if (
    t.includes("fingerprintIntentFit(fp, exp, session)") &&
    !t.includes("const session =")
  ) {
    const expLine =
      "  const exp = slug ? getExperienceIntent(slug) : undefined;\n";
    if (t.includes(expLine)) {
      t = t.replace(
        expLine,
        expLine +
          "  const session =\n    typeof window !== \"undefined\" ? readIntentSession() : null;\n",
      );
      changed = true;
    }
  }

  if (
    t.includes("const W = RANKER_V3_WEIGHTS;") &&
    t.includes("RANKER_V3_EXPLICIT_INTENT_WEIGHTS")
  ) {
    t = t.replace(
      "const W = RANKER_V3_WEIGHTS;",
      `const W =
    exp && exp.slug !== "surprise"
      ? RANKER_V3_EXPLICIT_INTENT_WEIGHTS
      : RANKER_V3_WEIGHTS;`,
    );
    changed = true;
  }

  if (changed) {
    fs.writeFileSync(file, t);
    console.log("[patch-ranker] patched", file);
  } else {
    console.log("[patch-ranker] already up to date");
  }
}

main();
