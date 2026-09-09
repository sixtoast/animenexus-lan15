/** Wire viewing intent into lantern-agent/tools.ts if still missing. */
const fs = require("fs");
const path = require("path");
const file = path.join(process.cwd(), "lib/lantern-agent/tools.ts");

function main() {
  if (!fs.existsSync(file)) return;
  let t = fs.readFileSync(file, "utf8");
  if (t.includes("getViewingIntent") && t.includes('forceVersion: "v3"')) {
    console.log("[patch-lantern-intent] already wired");
    return;
  }

  if (!t.includes("readIntentSession")) {
    t = t.replace(
      'import { rankRecommendations } from "@/lib/recommend-rank";\n',
      `import { rankRecommendations } from "@/lib/recommend-rank";
import {
  readIntentSession,
  readAiIntentOverlay,
} from "@/lib/intent-session";
import {
  getExperienceIntent,
  EXPERIENCE_INTENTS,
} from "@/lib/viewing-intent";
`,
    );
  }

  if (!t.includes('"getViewingIntent"')) {
    t = t.replace(
      '| "getRecommendations"\n  | "getCompletionQueue"',
      '| "getRecommendations"\n  | "getViewingIntent"\n  | "getCompletionQueue"',
    );
  }

  if (!t.includes('name: "getViewingIntent"')) {
    t = t.replace(
      `  {
    name: "getRecommendations",
    description: "Suggest anime ranked by resonance vs the user's shelf.",
    requiresConfirmation: false,
    parameters: { genres: "optional comma-separated genres" },
  },`,
      `  {
    name: "getViewingIntent",
    description:
      "Read the user's current Viewing Intent session (mood slug, dials, free-text overlay, avoids).",
    requiresConfirmation: false,
    parameters: {},
  },
  {
    name: "getRecommendations",
    description:
      "Suggest anime using Ranker V3 + current Viewing Intent when set.",
    requiresConfirmation: false,
    parameters: {
      genres: "optional comma-separated genres",
      intentSlug: "optional mood slug override",
    },
  },`,
    );
  }

  const start = t.indexOf('      case "getRecommendations": {');
  const end = t.indexOf('      case "getCompletionQueue": {');
  if (start >= 0 && end > start) {
    const replacement = `      case "getViewingIntent": {
        const session = readIntentSession();
        const overlay = readAiIntentOverlay();
        const slug = session.slug || overlay?.structured?.intent || null;
        const exp = slug ? getExperienceIntent(slug) : undefined;
        return {
          ok: true,
          tool: name,
          data: {
            session: {
              slug: session.slug,
              intensity: session.intensity,
              energy: session.energy,
              attention: session.attention,
              minutesAvailable: session.minutesAvailable,
            },
            experience: exp
              ? {
                  slug: exp.slug,
                  label: exp.label,
                  emoji: exp.emoji,
                  blurb: exp.blurb,
                  genreHints: exp.genreHints,
                }
              : null,
            freeText: overlay?.freeText || null,
            structured: overlay?.structured
              ? {
                  intent: overlay.structured.intent,
                  label: overlay.structured.label,
                  paraphrase: overlay.structured.paraphrase,
                  confidence: overlay.structured.confidence,
                  hardAvoid: overlay.structured.hardAvoid,
                  avoid: overlay.structured.avoid,
                  prefer: overlay.structured.prefer,
                  mustHave: overlay.structured.mustHave,
                }
              : null,
            availableIntents: EXPERIENCE_INTENTS.map((e) => ({
              slug: e.slug,
              label: e.label,
              emoji: e.emoji,
            })),
            note: "Current intent should steer recommendations more than lifetime genre taste.",
          },
        };
      }
      case "getRecommendations": {
        const entries = readWatchlist();
        const session = readIntentSession();
        const overlay = readAiIntentOverlay();
        const intentSlugArg = String(args.intentSlug || args.mood || "").trim();
        const slug =
          intentSlugArg ||
          session.slug ||
          overlay?.structured?.intent ||
          null;
        const exp = slug ? getExperienceIntent(slug) : undefined;
        const genresArg = String(args.genres || "")
          .split(",")
          .map((g) => g.trim())
          .filter(Boolean);
        const prefs = getGenrePreferences();
        const genres =
          genresArg.length > 0
            ? genresArg.slice(0, 3)
            : exp?.genreHints?.length
              ? exp.genreHints.slice(0, 3)
              : prefs.slice(0, 3).map((p) => p.value);
        if (!genres.length && !exp) {
          return {
            ok: false,
            tool: name,
            error:
              "No genres or viewing intent yet \u2014 pick a mood on /mood or add titles to the watchlist.",
          };
        }
        const page = await fetchByGenres(genres.length ? genres : ["Drama"], {
          perPage: 16,
          sort: ["SCORE_DESC", "POPULARITY_DESC"],
          excludeIds: entries.map((e) => e.id),
        });
        let candidates = page.data;
        const hard = overlay?.structured?.hardAvoid || [];
        if (hard.length) {
          const lowered = hard.map((h) => h.toLowerCase());
          candidates = candidates.filter((a) => {
            const blob = [a.title, a.genre, ...(a.tags || []), a.description || ""]
              .join(" ")
              .toLowerCase();
            return !lowered.some((h) => h.length > 2 && blob.includes(h));
          });
        }
        const ranked = rankRecommendations(candidates, entries, {
          excludeIds: entries.map((e) => e.id),
          experienceSlug: exp?.slug || slug || undefined,
          forceVersion: "v3",
        }).slice(0, 8);
        return {
          ok: true,
          tool: name,
          data: {
            viewingIntent: {
              slug: exp?.slug || slug,
              label: exp?.label || overlay?.structured?.label || null,
              intensity: session.intensity,
              energy: session.energy,
              attention: session.attention,
              freeText: overlay?.freeText || null,
              hardAvoid: hard,
              softAvoid: overlay?.structured?.avoid || [],
            },
            genresUsed: genres,
            picks: ranked.map((r) => ({
              ...compactAnime(r.anime),
              confidence: r.confidence,
              why: r.reasons[0],
              reasons: r.reasons.slice(0, 3),
            })),
            note: slug
              ? "Ranked with Viewing Intent (V3 fingerprint fit) active."
              : "No explicit intent slug \u2014 ranked from shelf taste only.",
          },
        };
      }
`;
    t = t.slice(0, start) + replacement + t.slice(end);
  }

  fs.writeFileSync(file, t);
  console.log("[patch-lantern-intent] patched", file);
}

try {
  main();
} catch (e) {
  console.error("[patch-lantern-intent]", e.message);
}
