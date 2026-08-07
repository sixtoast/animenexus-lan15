/** Common AniList genres for filter chips / selects */
export const ANIME_GENRES = [
  "Action",
  "Adventure",
  "Comedy",
  "Drama",
  "Ecchi",
  "Fantasy",
  "Horror",
  "Mahou Shoujo",
  "Mecha",
  "Music",
  "Mystery",
  "Psychological",
  "Romance",
  "Sci-Fi",
  "Slice of Life",
  "Sports",
  "Supernatural",
  "Thriller",
] as const;

export const MEDIA_FORMATS = [
  { value: "", label: "Any format" },
  { value: "TV", label: "TV" },
  { value: "MOVIE", label: "Movie" },
  { value: "OVA", label: "OVA" },
  { value: "ONA", label: "ONA" },
  { value: "SPECIAL", label: "Special" },
  { value: "TV_SHORT", label: "TV Short" },
] as const;

export const MEDIA_STATUSES = [
  { value: "", label: "Any status" },
  { value: "RELEASING", label: "Airing" },
  { value: "FINISHED", label: "Finished" },
  { value: "NOT_YET_RELEASED", label: "Upcoming" },
  { value: "CANCELLED", label: "Cancelled" },
  { value: "HIATUS", label: "Hiatus" },
] as const;

export const SORT_OPTIONS = [
  { value: "score", label: "Score" },
  { value: "popularity", label: "Popularity" },
  { value: "title", label: "Title" },
  { value: "year", label: "Year" },
] as const;

export const FEED_TABS = [
  { value: "trending", label: "Trending", icon: "🔥" },
  { value: "popular", label: "Popular", icon: "📈" },
  { value: "top", label: "Top rated", icon: "⭐" },
] as const;

/** Years from current down to 1960 */
export function yearOptions(from = new Date().getFullYear() + 1, to = 1960) {
  const years: { value: string; label: string }[] = [
    { value: "", label: "Any year" },
  ];
  for (let y = from; y >= to; y--) {
    years.push({ value: String(y), label: String(y) });
  }
  return years;
}
