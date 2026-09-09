/**
 * Ensure ranker uses V3 fingerprintIntentFit + explicit intent weights + AI overlay.
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

  if (!t.includes("readAiIntentOverlay")) {
    if (t.includes('from "@/lib/intent-session"')) {
      t = t.replace(
        /import \{([^}]+)\} from "@\/lib\/intent-session";/,
        (m, inner) => {
          if (inner.includes("readAiIntentOverlay")) return m;
          return `import { ${inner.trim().replace(/,$/, "")}, readAiIntentOverlay } from "@/lib/intent-session";`;
        },
      );
    } else {
      t = t.replace(
        "import { getExperienceIntent",
        `import { readIntentSession, readAiIntentOverlay } from "@/lib/intent-session";
import { structuredToExperienceIntent } from "@/lib/intelligence/ai/interpret-intent";
import { getExperienceIntent`,
      );
    }
    if (!t.includes("structuredToExperienceIntent")) {
      t = t.replace(
        'from "@/lib/intent-session";',
        `from "@/lib/intent-session";
import { structuredToExperienceIntent } from "@/lib/intelligence/ai/interpret-intent";`,
      );
    }
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

  if (!t.includes("structuredToExperienceIntent(aiOverlay")) {
    const emerging = t.indexOf("  const emergingVec = { ...userVec };");
    const slugIdx = t.search(/\n  (let|const) slug = opts\?\.experienceSlug/);
    if (emerging > 0) {
      const clean = `  let slug = opts?.experienceSlug ?? null;
  if (slug == null && typeof window !== "undefined") {
    try {
      slug = readIntentSession()?.slug ?? null;
    } catch {
      slug = null;
    }
  }
  let exp = slug ? getExperienceIntent(slug) : undefined;
  if (typeof window !== "undefined") {
    try {
      const aiOverlay = readAiIntentOverlay();
      if (
        aiOverlay?.structured &&
        Date.now() - (aiOverlay.at || 0) < 1000 * 60 * 60 * 6
      ) {
        exp = structuredToExperienceIntent(aiOverlay.structured);
      }
    } catch {
      /* ignore */
    }
  }
  const session =
    typeof window !== "undefined" ? readIntentSession() : null;
  const W =
    exp && exp.slug !== "surprise"
      ? RANKER_V3_EXPLICIT_INTENT_WEIGHTS
      : RANKER_V3_WEIGHTS;

`;
      if (slugIdx >= 0 && slugIdx < emerging) {
        t = t.slice(0, slugIdx + 1) + clean + t.slice(emerging);
      } else {
        t = t.slice(0, emerging) + clean + t.slice(emerging);
      }
      changed = true;
    }
  } else if (!t.includes("const session =") || !t.includes("const W =")) {
    const marker = "  let exp = slug ? getExperienceIntent(slug) : undefined;";
    if (t.includes(marker) && !t.includes("const session =")) {
      t = t.replace(
        marker,
        `  let exp = slug ? getExperienceIntent(slug) : undefined;
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

  t = t.replace(/\n  const W = RANKER_V3_WEIGHTS;\n/g, "\n");

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
