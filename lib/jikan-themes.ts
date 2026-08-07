/** OP/ED themes via Jikan (MAL id). Soft-fail. */

export type ThemeLists = {
  openings: string[];
  endings: string[];
};

export async function fetchThemesFromJikan(
  malId: number,
): Promise<ThemeLists | null> {
  if (!malId || malId < 1) return null;
  try {
    const res = await fetch(
      `https://api.jikan.moe/v4/anime/${malId}/themes`,
      {
        next: { revalidate: 86400 },
        headers: { Accept: "application/json" },
      },
    );
    if (!res.ok) return null;
    const json = (await res.json()) as {
      data?: { openings?: string[]; endings?: string[] };
    };
    const openings = json.data?.openings || [];
    const endings = json.data?.endings || [];
    if (!openings.length && !endings.length) return null;
    return { openings, endings };
  } catch {
    return null;
  }
}

export async function fetchMalIdFromAniList(
  anilistId: number,
): Promise<number | null> {
  try {
    const res = await fetch("https://graphql.anilist.co", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        query: `query ($id: Int) { Media(id: $id, type: ANIME) { idMal } }`,
        variables: { id: anilistId },
      }),
      next: { revalidate: 86400 },
    });
    if (!res.ok) return null;
    const json = (await res.json()) as {
      data?: { Media?: { idMal?: number | null } };
    };
    const mal = json.data?.Media?.idMal;
    return typeof mal === "number" && mal > 0 ? mal : null;
  } catch {
    return null;
  }
}

export function youtubeSearchUrl(q: string): string {
  return `https://www.youtube.com/results?search_query=${encodeURIComponent(q)}`;
}
