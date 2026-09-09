/**
 * If ranker still uses the fake-anime intent path, rewrite the intent block.
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
  if (t.includes("fingerprintIntentFit(fp, exp") && !t.includes("id: -10")) {
    console.log("[patch-ranker] already fixed");
    return;
  }

  if (!t.includes("fingerprintIntentFit")) {
    t = t.replace(
      'import { getExperienceIntent } from "@/lib/viewing-intent";',
      `import {
  getExperienceIntent,
  fingerprintIntentFit,
} from "@/lib/viewing-intent";`,
    );
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
  }

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
  }

  if (!t.includes("const W =")) {
    t = t.replace(
      "  const exp = slug ? getExperienceIntent(slug) : undefined;",
      `  const exp = slug ? getExperienceIntent(slug) : undefined;
  const session =
    typeof window !== "undefined" ? readIntentSession() : null;
  const W =
    exp && exp.slug !== "surprise"
      ? RANKER_V3_EXPLICIT_INTENT_WEIGHTS
      : RANKER_V3_WEIGHTS;`,
    );
  }
  t = t.replace(/  const W = RANKER_V3_WEIGHTS;\n/, "");

  fs.writeFileSync(file, t);
  console.log("[patch-ranker] patched", file);
}

try {
  main();
} catch (e) {
  console.error("[patch-ranker]", e.message);
}
