const fs = require("fs");
const path = require("path");
const file = path.join(__dirname, "..", "lib/providers/jikan.ts");
if (!fs.existsSync(file)) process.exit(0);
let t = fs.readFileSync(file, "utf8");
if (t.includes("fetchJikanFullAnime")) {
  console.log("[patch-jikan-full] already present");
  process.exit(0);
}
const append = `

/** Full anime row for semantic enrichment (Class A + Class B). */
export type JikanFullAnime = {
  malId: number;
  title: string;
  synopsis?: string;
  background?: string;
  genres: { name: string; malId?: number }[];
  explicitGenres: { name: string; malId?: number }[];
  themes: { name: string; malId?: number }[];
  demographics: { name: string; malId?: number }[];
  source?: string;
  type?: string;
  episodes?: number;
  duration?: string;
  status?: string;
  season?: string;
  year?: number;
  rating?: string;
  score?: number;
  scoredBy?: number;
  rank?: number;
  popularity?: number;
  members?: number;
  favorites?: number;
  studios: string[];
  producers: string[];
  licensors: string[];
};

function mapNamedList(
  arr: { name?: string; mal_id?: number }[] | undefined,
): { name: string; malId?: number }[] {
  if (!arr) return [];
  return arr
    .filter((x) => x?.name)
    .map((x) => ({ name: x.name as string, malId: x.mal_id }));
}

/** Fetch full Jikan anime for known MAL id — semantic enrichment. */
export async function fetchJikanFullAnime(
  malId: number,
): Promise<JikanFullAnime | null> {
  if (!malId || malId < 1) return null;
  const key = cacheKey(["jikan", "full", malId]);
  return dedupedFetch(
    key,
    async () => {
      try {
        const json = await jikanGet<{
          data?: {
            mal_id?: number;
            title?: string;
            synopsis?: string;
            background?: string;
            genres?: { name?: string; mal_id?: number }[];
            explicit_genres?: { name?: string; mal_id?: number }[];
            themes?: { name?: string; mal_id?: number }[];
            demographics?: { name?: string; mal_id?: number }[];
            source?: string;
            type?: string;
            episodes?: number;
            duration?: string;
            status?: string;
            season?: string;
            year?: number;
            rating?: string;
            score?: number;
            scored_by?: number;
            rank?: number;
            popularity?: number;
            members?: number;
            favorites?: number;
            studios?: { name?: string }[];
            producers?: { name?: string }[];
            licensors?: { name?: string }[];
          };
        }>(\`/anime/\${malId}/full\`);
        const d = json?.data;
        if (!d?.mal_id) return null;
        return {
          malId: d.mal_id,
          title: d.title || "",
          synopsis: d.synopsis || undefined,
          background: d.background || undefined,
          genres: mapNamedList(d.genres),
          explicitGenres: mapNamedList(d.explicit_genres),
          themes: mapNamedList(d.themes),
          demographics: mapNamedList(d.demographics),
          source: d.source,
          type: d.type,
          episodes: d.episodes,
          duration: d.duration,
          status: d.status,
          season: d.season,
          year: d.year,
          rating: d.rating,
          score: d.score,
          scoredBy: d.scored_by,
          rank: d.rank,
          popularity: d.popularity,
          members: d.members,
          favorites: d.favorites,
          studios: (d.studios || [])
            .map((s) => s.name)
            .filter(Boolean) as string[],
          producers: (d.producers || [])
            .map((s) => s.name)
            .filter(Boolean) as string[],
          licensors: (d.licensors || [])
            .map((s) => s.name)
            .filter(Boolean) as string[],
        };
      } catch {
        return null;
      }
    },
    CACHE_TTL.medium,
  );
}
`;
fs.writeFileSync(file, t + append);
console.log("[patch-jikan-full] applied");
