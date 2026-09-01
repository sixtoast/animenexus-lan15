/**
 * Natural-language → Viewing Intent + catalog filters.
 * Examples: "something funny and short", "like psychological but gentle".
 */

import type { AnimeFilters } from "./types";
import { getExperienceIntent, type ExperienceIntent } from "./viewing-intent";

export type ParsedIntentSearch = {
  /** Clean keyword for AniList title search (may be empty if pure intent) */
  keyword: string;
  filters: AnimeFilters;
  experienceSlug?: string;
  /** Human summary of what we understood */
  summary: string;
  /** True when query looked like intent language, not a pure title */
  isIntentQuery: boolean;
};

const INTENT_PHRASES: { re: RegExp; slug: string }[] = [
  { re: /\b(comfort|cozy|feel.?good|warm)\b/i, slug: "comfort" },
  { re: /\b(destroy|devastat|cry|tear.?jerker|heartbreak)\b/i, slug: "destroy" },
  { re: /\b(make me think|cerebral|mind.?bend|psychological|think)\b/i, slug: "think" },
  { re: /\b(laugh|funny|comedy|hilarious|humou?r)\b/i, slug: "laugh" },
  { re: /\b(tense|thriller|suspense|hype|action.?packed)\b/i, slug: "tense" },
  { re: /\b(wonder|awe|fantasy|magical)\b/i, slug: "wonder" },
  { re: /\b(gentle|soft|slow.?burn|calm|chill)\b/i, slug: "gentle" },
  { re: /\b(chaotic|absurd|wild|crazy)\b/i, slug: "chaotic" },
  { re: /\b(romance|romantic|love story)\b/i, slug: "romance" },
  { re: /\b(surprise|random|anything)\b/i, slug: "surprise" },
];

const GENRE_PHRASES: { re: RegExp; genre: string }[] = [
  { re: /\bslice of life\b/i, genre: "Slice of Life" },
  { re: /\b(sci-?fi|science fiction)\b/i, genre: "Sci-Fi" },
  { re: /\bhorror\b/i, genre: "Horror" },
  { re: /\bdrama\b/i, genre: "Drama" },
  { re: /\baction\b/i, genre: "Action" },
  { re: /\bmystery\b/i, genre: "Mystery" },
  { re: /\bsports\b/i, genre: "Sports" },
  { re: /\bmecha\b/i, genre: "Mecha" },
  { re: /\bsupernatural\b/i, genre: "Supernatural" },
];

const FORMAT_PHRASES: { re: RegExp; format: string }[] = [
  { re: /\b(movie|film)\b/i, format: "MOVIE" },
  { re: /\b(ova)\b/i, format: "OVA" },
  { re: /\b(short series|one.cour|12 ep|13 ep)\b/i, format: "TV" },
];

/** Strip filler words so leftover becomes title keyword. */
function extractKeyword(raw: string): string {
  let s = raw
    .replace(/\bsomething (like|for|with)?\b/gi, " ")
    .replace(/\banime(s)?\b/gi, " ")
    .replace(/\b(show|series|recommend|recommendation)s?\b/gi, " ")
    .replace(/\b(but|and|with|that is|that's|thats)\b/gi, " ")
    .replace(/\b(funny|funnier|shorter|gentle|heavy|dark|light)\b/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
  // Drop very short leftovers
  if (s.length < 3) return "";
  return s;
}

export function parseIntentSearch(query: string): ParsedIntentSearch {
  const q = query.trim();
  const filters: AnimeFilters = { adultFilter: "exclude", sort: "score" };
  const bits: string[] = [];
  let experienceSlug: string | undefined;
  let isIntentQuery = false;

  // Heuristic: multi-word soft language → intent query
  if (
    /\b(something|feel|tonight|like|but|make me|want|need)\b/i.test(q) ||
    INTENT_PHRASES.some((p) => p.re.test(q))
  ) {
    isIntentQuery = true;
  }

  for (const p of INTENT_PHRASES) {
    if (p.re.test(q)) {
      experienceSlug = p.slug;
      bits.push(`intent: ${p.slug}`);
      isIntentQuery = true;
      break;
    }
  }

  for (const g of GENRE_PHRASES) {
    if (g.re.test(q)) {
      filters.genre = g.genre;
      bits.push(`genre: ${g.genre}`);
      isIntentQuery = true;
      break;
    }
  }

  for (const f of FORMAT_PHRASES) {
    if (f.re.test(q)) {
      filters.format = f.format;
      bits.push(`format: ${f.format}`);
      isIntentQuery = true;
      break;
    }
  }

  if (/\b(short|shorter|quick)\b/i.test(q)) {
    // Prefer movies / shorter via format when not already set
    if (!filters.format) {
      bits.push("prefer shorter runs");
    }
    isIntentQuery = true;
  }

  if (/\b(long|100\+?|long.?running)\b/i.test(q)) {
    bits.push("long-running ok");
    isIntentQuery = true;
  }

  // Apply experience genre hint when no explicit genre
  if (experienceSlug && !filters.genre) {
    const exp = getExperienceIntent(experienceSlug) as ExperienceIntent | undefined;
    if (exp?.genreHints?.[0]) {
      filters.genre = exp.genreHints[0];
      bits.push(`hint genre: ${exp.genreHints[0]}`);
    }
  }

  const keyword = isIntentQuery ? extractKeyword(q) : q;
  if (keyword) {
    filters.search = keyword;
    bits.push(`keyword: ${keyword}`);
  }

  const summary = bits.length
    ? bits.join(" · ")
    : "Title search";

  return {
    keyword,
    filters,
    experienceSlug,
    summary,
    isIntentQuery,
  };
}
