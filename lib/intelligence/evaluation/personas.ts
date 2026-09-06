/**
 * Synthetic recommendation personas for property tests / lab.
 */

import type { WatchlistEntry, WatchStatus } from "@/lib/types";

export type SyntheticPersona = {
  id: string;
  label: string;
  description: string;
  expected: string[];
  entries: WatchlistEntry[];
};

function entry(
  id: number,
  title: string,
  status: WatchStatus,
  genres: string[],
  opts?: Partial<WatchlistEntry>,
): WatchlistEntry {
  const daysAgo = (id % 180) + 10;
  const ts = new Date(Date.now() - daysAgo * 86400000).toISOString();
  return {
    id,
    title,
    image: "",
    format: "TV",
    year: 2019,
    episodes: 12,
    duration: 24,
    score: 78,
    watchStatus: status,
    progress: status === "completed" ? 12 : status === "watching" ? 5 : 0,
    userRating: status === "completed" ? 8 : 0,
    notes: "",
    genres,
    tags: genres,
    addedAt: ts,
    updatedAt: ts,
    ...opts,
    // Required fields must stay defined after Partial spread
    addedAt: opts?.addedAt ?? ts,
    updatedAt: opts?.updatedAt ?? ts,
  };
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
      entry(1535, "Death Note", "completed", [
        "Psychological",
        "Mystery",
        "Thriller",
      ]),
      entry(19, "Monster", "completed", ["Psychological", "Mystery", "Drama"]),
      entry(437, "Perfect Blue", "completed", [
        "Psychological",
        "Drama",
        "Horror",
      ]),
      entry(339, "Serial Experiments Lain", "completed", [
        "Psychological",
        "Sci-Fi",
      ]),
      entry(205, "Samurai Champloo", "planning", ["Action", "Adventure"]),
    ],
  },
  {
    id: "romance_binge",
    label: "Romance binge watcher",
    description: "High completion on romance / relationship focus.",
    expected: ["romance and relationshipFocus high", "lower actionIntensity"],
    entries: [
      entry(20602, "Kaguya-sama", "completed", ["Comedy", "Romance"]),
      entry(14813, "Horimiya", "completed", ["Romance", "Slice of Life"]),
      entry(21327, "Fruits Basket", "completed", ["Drama", "Romance"]),
      entry(10165, "Nisekoi", "dropped", ["Comedy", "Romance"], {
        progress: 2,
        episodes: 20,
      }),
    ],
  },
  {
    id: "broad_omnivore",
    label: "Broad omnivore",
    description: "Completions across many genres.",
    expected: ["multiple clusters", "moderate novelty"],
    entries: [
      entry(16498, "Attack on Titan", "completed", ["Action", "Drama"]),
      entry(5114, "Fullmetal Alchemist", "completed", [
        "Action",
        "Adventure",
        "Drama",
      ]),
      entry(9253, "Steins;Gate", "completed", ["Sci-Fi", "Thriller"]),
      entry(11061, "Hunter x Hunter", "completed", ["Action", "Adventure"], {
        episodes: 148,
      }),
      entry(820, "GTO", "completed", ["Comedy", "Drama"]),
    ],
  },
  {
    id: "new_user",
    label: "New user",
    description: "Almost empty shelf.",
    expected: ["low confidence", "soft recommendations"],
    entries: [entry(1, "Cowboy Bebop", "planning", ["Action", "Sci-Fi"])],
  },
  {
    id: "long_series_dropper",
    label: "Long-series dropper",
    description: "Finishes short cours; drops 50+ episode shows.",
    expected: ["length contradiction", "short completion higher"],
    entries: [
      entry(21, "One Piece", "dropped", ["Action", "Adventure"], {
        episodes: 1000,
        progress: 30,
      }),
      entry(20, "Naruto", "dropped", ["Action", "Adventure"], {
        episodes: 220,
        progress: 40,
      }),
      entry(269, "Bleach", "dropped", ["Action", "Adventure"], {
        episodes: 366,
        progress: 20,
      }),
      entry(6547, "Angel Beats", "completed", ["Drama", "Supernatural"], {
        episodes: 13,
      }),
      entry(11757, "Sword Art Online", "completed", ["Action", "Adventure"], {
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
      entry(5114, "FMA Brotherhood", "completed", ["Action", "Adventure"], {
        score: 90,
      }),
      entry(16498, "Attack on Titan", "completed", ["Action", "Drama"], {
        score: 88,
      }),
      entry(11061, "Hunter x Hunter", "completed", ["Action", "Adventure"], {
        score: 89,
      }),
      entry(9253, "Steins;Gate", "completed", ["Sci-Fi", "Thriller"], {
        score: 89,
      }),
    ],
  },
  {
    id: "experimental_explorer",
    label: "Experimental explorer",
    description: "Seeks unusual, lower-score, high-complexity works.",
    expected: ["higher novelty", "cognitiveLoad tolerance"],
    entries: [
      entry(339, "Lain", "completed", ["Psychological", "Sci-Fi"], {
        score: 72,
      }),
      entry(101, "FLCL", "completed", ["Comedy", "Sci-Fi"], { score: 78 }),
      entry(226, "Elfen Lied", "completed", ["Drama", "Horror"], {
        score: 72,
      }),
      entry(10087, "Fate/Zero", "completed", ["Action", "Fantasy"], {
        score: 82,
      }),
    ],
  },
];

export function getPersona(id: string): SyntheticPersona | undefined {
  return SYNTHETIC_PERSONAS.find((p) => p.id === id);
}
