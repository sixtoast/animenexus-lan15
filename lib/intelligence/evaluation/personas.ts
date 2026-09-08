/**
 * Synthetic recommendation personas for property tests / lab / offline eval.
 * Entries use staggered timestamps so chronological holdout is meaningful.
 */

import type { WatchlistEntry, WatchStatus } from "@/lib/types";

export type SyntheticPersona = {
  id: string;
  label: string;
  description: string;
  expected: string[];
  entries: WatchlistEntry[];
};

export type CatalogueSeed = {
  id: number;
  title: string;
  genres: string[];
  score?: number;
  episodes?: number;
};

export const EVAL_CATALOGUE: CatalogueSeed[] = [
  { id: 1535, title: "Death Note", genres: ["Psychological", "Mystery", "Thriller"], score: 86 },
  { id: 19, title: "Monster", genres: ["Psychological", "Mystery", "Drama"], score: 90 },
  { id: 437, title: "Perfect Blue", genres: ["Psychological", "Drama", "Horror"], score: 84 },
  { id: 339, title: "Serial Experiments Lain", genres: ["Psychological", "Sci-Fi"], score: 78 },
  { id: 205, title: "Samurai Champloo", genres: ["Action", "Adventure"], score: 85 },
  { id: 20602, title: "Kaguya-sama", genres: ["Comedy", "Romance"], score: 88 },
  { id: 14813, title: "Horimiya", genres: ["Romance", "Slice of Life"], score: 84 },
  { id: 21327, title: "Fruits Basket", genres: ["Drama", "Romance"], score: 86 },
  { id: 10165, title: "Nisekoi", genres: ["Comedy", "Romance"], score: 76, episodes: 20 },
  { id: 16498, title: "Attack on Titan", genres: ["Action", "Drama"], score: 88 },
  { id: 5114, title: "Fullmetal Alchemist: Brotherhood", genres: ["Action", "Adventure", "Drama"], score: 90 },
  { id: 9253, title: "Steins;Gate", genres: ["Sci-Fi", "Thriller"], score: 89 },
  { id: 11061, title: "Hunter x Hunter", genres: ["Action", "Adventure"], score: 89, episodes: 148 },
  { id: 820, title: "Great Teacher Onizuka", genres: ["Comedy", "Drama"], score: 87 },
  { id: 1, title: "Cowboy Bebop", genres: ["Action", "Sci-Fi"], score: 88 },
  { id: 21, title: "One Piece", genres: ["Action", "Adventure"], score: 87, episodes: 1000 },
  { id: 20, title: "Naruto", genres: ["Action", "Adventure"], score: 79, episodes: 220 },
  { id: 269, title: "Bleach", genres: ["Action", "Adventure"], score: 78, episodes: 366 },
  { id: 6547, title: "Angel Beats!", genres: ["Drama", "Supernatural"], score: 81, episodes: 13 },
  { id: 11757, title: "Sword Art Online", genres: ["Action", "Adventure", "Romance"], score: 72, episodes: 25 },
  { id: 101, title: "FLCL", genres: ["Comedy", "Sci-Fi"], score: 78, episodes: 6 },
  { id: 226, title: "Elfen Lied", genres: ["Drama", "Horror"], score: 72 },
  { id: 10087, title: "Fate/Zero", genres: ["Action", "Fantasy"], score: 82 },
  { id: 223, title: "Dragon Ball", genres: ["Action", "Adventure"], score: 80, episodes: 153 },
  { id: 30, title: "Neon Genesis Evangelion", genres: ["Psychological", "Drama", "Sci-Fi"], score: 83 },
  { id: 1575, title: "Code Geass", genres: ["Action", "Drama", "Sci-Fi"], score: 87 },
  { id: 918, title: "Gintama", genres: ["Action", "Comedy"], score: 88, episodes: 201 },
  { id: 30276, title: "One Punch Man", genres: ["Action", "Comedy"], score: 84, episodes: 12 },
  { id: 31240, title: "Re:Zero", genres: ["Drama", "Fantasy", "Thriller"], score: 83 },
  { id: 19815, title: "No Game No Life", genres: ["Comedy", "Fantasy", "Ecchi"], score: 79 },
  { id: 13601, title: "Psycho-Pass", genres: ["Psychological", "Sci-Fi", "Thriller"], score: 84 },
  { id: 9756, title: "Madoka Magica", genres: ["Drama", "Psychological", "Thriller"], score: 85, episodes: 12 },
  { id: 5081, title: "Bakemonogatari", genres: ["Comedy", "Mystery", "Romance"], score: 83 },
  { id: 4224, title: "Toradora!", genres: ["Comedy", "Romance"], score: 82 },
  { id: 12189, title: "Hyouka", genres: ["Mystery", "Slice of Life"], score: 81 },
  { id: 28171, title: "Shouwa Genroku Rakugo Shinjuu", genres: ["Drama"], score: 86 },
  { id: 33, title: "Berserk", genres: ["Action", "Adventure", "Horror"], score: 85 },
  { id: 457, title: "Mushishi", genres: ["Adventure", "Fantasy", "Slice of Life"], score: 88 },
  { id: 17074, title: "Monogatari Series Second Season", genres: ["Comedy", "Mystery", "Supernatural"], score: 87 },
  { id: 32281, title: "Kimi no Na wa", genres: ["Drama", "Romance", "Supernatural"], score: 88, episodes: 1 },
];

function entry(
  id: number,
  title: string,
  status: WatchStatus,
  genres: string[],
  opts?: Partial<WatchlistEntry> & { daysAgo?: number },
): WatchlistEntry {
  const daysAgo = opts?.daysAgo ?? (id % 180) + 10;
  const ts = new Date(Date.now() - daysAgo * 86400000).toISOString();
  const { addedAt: _a, updatedAt: _u, daysAgo: _d, ...rest } = opts || {};
  const episodes = rest.episodes ?? 12;
  return {
    id,
    title,
    image: "",
    format: episodes === 1 ? "MOVIE" : "TV",
    year: 2019,
    episodes,
    duration: 24,
    score: 78,
    watchStatus: status,
    progress:
      status === "completed"
        ? typeof episodes === "number"
          ? episodes
          : 12
        : status === "watching"
          ? 5
          : 0,
    userRating: status === "completed" ? 8 : 0,
    notes: "",
    genres,
    tags: genres,
    ...rest,
    addedAt: opts?.addedAt ?? ts,
    updatedAt: opts?.updatedAt ?? ts,
  };
}

function e(
  id: number,
  title: string,
  status: WatchStatus,
  genres: string[],
  daysAgo: number,
  opts?: Partial<WatchlistEntry>,
) {
  return entry(id, title, status, genres, { ...opts, daysAgo });
}

export const SYNTHETIC_PERSONAS: SyntheticPersona[] = [
  {
    id: "psychological_specialist",
    label: "Psychological specialist",
    description: "Completes dense, moral, mystery-forward series.",
    expected: [
      "high cognitiveLoad affinity",
      "mysteryDensity and moralAmbiguity peaks",
      "low pure-spectacle preference",
    ],
    entries: [
      e(1535, "Death Note", "completed", ["Psychological", "Mystery", "Thriller"], 200),
      e(19, "Monster", "completed", ["Psychological", "Mystery", "Drama"], 160),
      e(437, "Perfect Blue", "completed", ["Psychological", "Drama", "Horror"], 120),
      e(339, "Serial Experiments Lain", "completed", ["Psychological", "Sci-Fi"], 90),
      e(13601, "Psycho-Pass", "completed", ["Psychological", "Sci-Fi", "Thriller"], 60),
      e(9756, "Madoka Magica", "completed", ["Drama", "Psychological", "Thriller"], 40),
      e(30, "Neon Genesis Evangelion", "completed", ["Psychological", "Drama", "Sci-Fi"], 25),
      e(205, "Samurai Champloo", "planning", ["Action", "Adventure"], 10),
      e(30276, "One Punch Man", "dropped", ["Action", "Comedy"], 15, {
        progress: 3,
        episodes: 12,
      }),
    ],
  },
  {
    id: "romance_binge",
    label: "Romance binge watcher",
    description: "High completion on romance / relationship focus.",
    expected: ["romance and relationshipFocus high", "lower actionIntensity"],
    entries: [
      e(4224, "Toradora!", "completed", ["Comedy", "Romance"], 180),
      e(20602, "Kaguya-sama", "completed", ["Comedy", "Romance"], 140),
      e(14813, "Horimiya", "completed", ["Romance", "Slice of Life"], 100),
      e(21327, "Fruits Basket", "completed", ["Drama", "Romance"], 70),
      e(32281, "Kimi no Na wa", "completed", ["Drama", "Romance", "Supernatural"], 35, {
        episodes: 1,
      }),
      e(10165, "Nisekoi", "dropped", ["Comedy", "Romance"], 50, {
        progress: 2,
        episodes: 20,
      }),
      e(16498, "Attack on Titan", "planning", ["Action", "Drama"], 8),
    ],
  },
  {
    id: "broad_omnivore",
    label: "Broad omnivore",
    description: "Completions across many genres.",
    expected: ["multiple clusters", "moderate novelty"],
    entries: [
      e(16498, "Attack on Titan", "completed", ["Action", "Drama"], 220),
      e(5114, "Fullmetal Alchemist: Brotherhood", "completed", ["Action", "Adventure", "Drama"], 190),
      e(9253, "Steins;Gate", "completed", ["Sci-Fi", "Thriller"], 160),
      e(11061, "Hunter x Hunter", "completed", ["Action", "Adventure"], 130, {
        episodes: 148,
      }),
      e(820, "Great Teacher Onizuka", "completed", ["Comedy", "Drama"], 100),
      e(20602, "Kaguya-sama", "completed", ["Comedy", "Romance"], 70),
      e(457, "Mushishi", "completed", ["Adventure", "Fantasy", "Slice of Life"], 40),
      e(31240, "Re:Zero", "watching", ["Drama", "Fantasy", "Thriller"], 12, {
        progress: 8,
        episodes: 25,
      }),
    ],
  },
  {
    id: "new_user",
    label: "New user",
    description: "Almost empty shelf.",
    expected: ["low confidence", "soft recommendations"],
    entries: [e(1, "Cowboy Bebop", "planning", ["Action", "Sci-Fi"], 5)],
  },
  {
    id: "long_series_dropper",
    label: "Long-series dropper",
    description: "Finishes short cours; drops 50+ episode shows.",
    expected: ["length contradiction", "short completion higher"],
    entries: [
      e(21, "One Piece", "dropped", ["Action", "Adventure"], 200, {
        episodes: 1000,
        progress: 30,
      }),
      e(20, "Naruto", "dropped", ["Action", "Adventure"], 170, {
        episodes: 220,
        progress: 40,
      }),
      e(269, "Bleach", "dropped", ["Action", "Adventure"], 140, {
        episodes: 366,
        progress: 20,
      }),
      e(223, "Dragon Ball", "dropped", ["Action", "Adventure"], 110, {
        episodes: 153,
        progress: 25,
      }),
      e(6547, "Angel Beats!", "completed", ["Drama", "Supernatural"], 80, {
        episodes: 13,
      }),
      e(30276, "One Punch Man", "completed", ["Action", "Comedy"], 50, {
        episodes: 12,
      }),
      e(9756, "Madoka Magica", "completed", ["Drama", "Psychological", "Thriller"], 30, {
        episodes: 12,
      }),
      e(11757, "Sword Art Online", "completed", ["Action", "Adventure", "Romance"], 15, {
        episodes: 25,
      }),
    ],
  },
  {
    id: "safe_choice",
    label: "Safe-choice user",
    description: "High-score mainstream completions only.",
    expected: ["low novelty tolerance", "high community quality weight"],
    entries: [
      e(5114, "Fullmetal Alchemist: Brotherhood", "completed", ["Action", "Adventure", "Drama"], 200, {
        score: 90,
      }),
      e(16498, "Attack on Titan", "completed", ["Action", "Drama"], 160, {
        score: 88,
      }),
      e(11061, "Hunter x Hunter", "completed", ["Action", "Adventure"], 120, {
        score: 89,
        episodes: 148,
      }),
      e(9253, "Steins;Gate", "completed", ["Sci-Fi", "Thriller"], 80, {
        score: 89,
      }),
      e(1, "Cowboy Bebop", "completed", ["Action", "Sci-Fi"], 45, {
        score: 88,
      }),
      e(1575, "Code Geass", "completed", ["Action", "Drama", "Sci-Fi"], 20, {
        score: 87,
      }),
    ],
  },
  {
    id: "experimental_explorer",
    label: "Experimental explorer",
    description: "Seeks unusual, lower-score, high-complexity works.",
    expected: ["higher novelty", "cognitiveLoad tolerance"],
    entries: [
      e(339, "Serial Experiments Lain", "completed", ["Psychological", "Sci-Fi"], 180, {
        score: 72,
      }),
      e(101, "FLCL", "completed", ["Comedy", "Sci-Fi"], 150, {
        score: 78,
        episodes: 6,
      }),
      e(226, "Elfen Lied", "completed", ["Drama", "Horror"], 120, {
        score: 72,
      }),
      e(437, "Perfect Blue", "completed", ["Psychological", "Drama", "Horror"], 90, {
        score: 84,
      }),
      e(28171, "Shouwa Genroku Rakugo Shinjuu", "completed", ["Drama"], 55, {
        score: 86,
      }),
      e(10087, "Fate/Zero", "completed", ["Action", "Fantasy"], 25, {
        score: 82,
      }),
      e(30276, "One Punch Man", "planning", ["Action", "Comedy"], 5, {
        score: 84,
      }),
    ],
  },
  {
    id: "slice_comfort",
    label: "Slice-of-life comfort",
    description: "Finishes gentle, low-stakes character shows.",
    expected: ["comfort high", "low actionIntensity", "lower cognitiveLoad"],
    entries: [
      e(457, "Mushishi", "completed", ["Adventure", "Fantasy", "Slice of Life"], 160),
      e(12189, "Hyouka", "completed", ["Mystery", "Slice of Life"], 120),
      e(14813, "Horimiya", "completed", ["Romance", "Slice of Life"], 80),
      e(5081, "Bakemonogatari", "watching", ["Comedy", "Mystery", "Romance"], 20, {
        progress: 6,
        episodes: 15,
      }),
      e(16498, "Attack on Titan", "dropped", ["Action", "Drama"], 40, {
        progress: 2,
        episodes: 25,
      }),
    ],
  },
];

export function getPersona(id: string): SyntheticPersona | undefined {
  return SYNTHETIC_PERSONAS.find((p) => p.id === id);
}

export function catalogueAsEntries(): WatchlistEntry[] {
  return EVAL_CATALOGUE.map((c) =>
    entry(c.id, c.title, "planning", c.genres, {
      score: c.score ?? 75,
      episodes: c.episodes ?? 12,
      daysAgo: 1,
    }),
  );
}
