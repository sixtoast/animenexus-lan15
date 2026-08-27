/**
 * Viewing context / history layers (API Expansion II Sprint 19).
 * Soft framing only — never claims "you must watch X because era Y".
 */

export type ViewingContextInput = {
  title: string;
  year?: number | string | null;
  season?: string | null;
  seasonYear?: number | null;
  format?: string | null;
  status?: string | null;
  sourceMaterial?: string | null;
  studios?: string[];
  episodes?: number | string | null;
};

export type ContextChip = {
  id: string;
  label: string;
  /** Short neutral note */
  note?: string;
};

export type ViewingContext = {
  chips: ContextChip[];
  /** One optional sentence for UI */
  summary?: string;
};

function yearNum(y: number | string | null | undefined): number | null {
  if (y == null || y === "") return null;
  const n = typeof y === "number" ? y : parseInt(String(y), 10);
  return Number.isFinite(n) && n > 1950 && n < 2100 ? n : null;
}

function eraLabel(year: number): ContextChip | null {
  if (year < 1980)
    return {
      id: "era-classic",
      label: "Classic era",
      note: "Pre-1980s television / film anime",
    };
  if (year < 1990)
    return {
      id: "era-80s",
      label: "1980s",
      note: "Late analog broadcast era",
    };
  if (year < 2000)
    return {
      id: "era-90s",
      label: "1990s",
      note: "Cable / VHS-adjacent boom",
    };
  if (year < 2010)
    return {
      id: "era-00s",
      label: "2000s",
      note: "Digital production ramp-up",
    };
  if (year < 2020)
    return {
      id: "era-10s",
      label: "2010s",
      note: "Streaming-first distribution grows",
    };
  return {
    id: "era-20s",
    label: "2020s",
    note: "Current decade",
  };
}

function formatChip(format: string | null | undefined): ContextChip | null {
  if (!format) return null;
  const f = format.toUpperCase();
  const map: Record<string, string> = {
    TV: "TV series",
    TV_SHORT: "TV short",
    MOVIE: "Film",
    OVA: "OVA",
    ONA: "ONA",
    SPECIAL: "Special",
    MUSIC: "Music video",
  };
  const label = map[f] || format.replace(/_/g, " ");
  return { id: `fmt-${f}`, label };
}

function lengthChip(
  episodes: number | string | null | undefined,
  format?: string | null,
): ContextChip | null {
  const n =
    typeof episodes === "number"
      ? episodes
      : parseInt(String(episodes || ""), 10);
  if (!Number.isFinite(n) || n <= 0) return null;
  const f = (format || "").toUpperCase();
  if (f === "MOVIE") return { id: "len-film", label: "Feature length" };
  if (n === 1) return { id: "len-1", label: "Single episode" };
  if (n <= 13) return { id: "len-cour", label: `1-cour (~${n} ep)` };
  if (n <= 26) return { id: "len-2cour", label: `2-cour (~${n} ep)` };
  if (n <= 50) return { id: "len-long", label: `Long series (${n} ep)` };
  return { id: "len-xl", label: `Very long (${n} ep)` };
}

function seasonChip(
  season: string | null | undefined,
  seasonYear: number | null | undefined,
): ContextChip | null {
  if (!season || !seasonYear) return null;
  const s =
    season.charAt(0).toUpperCase() +
    season.slice(1).toLowerCase();
  return {
    id: `season-${seasonYear}-${season}`,
    label: `${s} ${seasonYear}`,
    note: "Broadcast / release season when known",
  };
}

function statusChip(status: string | null | undefined): ContextChip | null {
  if (!status) return null;
  const s = status.toUpperCase();
  if (s === "RELEASING")
    return { id: "st-airing", label: "Currently airing" };
  if (s === "NOT_YET_RELEASED")
    return { id: "st-upcoming", label: "Upcoming" };
  if (s === "FINISHED") return { id: "st-finished", label: "Finished" };
  if (s === "HIATUS") return { id: "st-hiatus", label: "On hiatus" };
  if (s === "CANCELLED") return { id: "st-cancelled", label: "Cancelled" };
  return null;
}

/**
 * Build neutral context chips from known fields only.
 */
export function buildViewingContext(input: ViewingContextInput): ViewingContext {
  const chips: ContextChip[] = [];
  const y = yearNum(input.year) ?? yearNum(input.seasonYear);

  const era = y != null ? eraLabel(y) : null;
  if (era) chips.push(era);

  const season = seasonChip(input.season, input.seasonYear ?? y);
  if (season) chips.push(season);

  const fmt = formatChip(input.format);
  if (fmt) chips.push(fmt);

  const len = lengthChip(input.episodes, input.format);
  if (len) chips.push(len);

  const st = statusChip(input.status);
  if (st) chips.push(st);

  if (input.studios?.length) {
    chips.push({
      id: "studio",
      label: input.studios.slice(0, 2).join(" · "),
      note:
        input.studios.length > 2
          ? `+${input.studios.length - 2} more`
          : undefined,
    });
  }

  let summary: string | undefined;
  if (era && season) {
    summary = `${input.title} sits in the ${era.label.toLowerCase()} (${season.label}).`;
  } else if (era) {
    summary = `${input.title} is framed as ${era.label.toLowerCase()} anime when year is known.`;
  } else if (fmt) {
    summary = `${input.title} is catalogued as ${fmt.label}.`;
  }

  return { chips, summary };
}

/** Compare two titles for “same era” soft signal (not a rec engine). */
export function sameEraYears(
  a: number | string | null | undefined,
  b: number | string | null | undefined,
  window = 5,
): boolean {
  const ya = yearNum(a);
  const yb = yearNum(b);
  if (ya == null || yb == null) return false;
  return Math.abs(ya - yb) <= window;
}
