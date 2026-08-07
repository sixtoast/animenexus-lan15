import "./detail.css";
import "./sprint-b-detail.css";
import Link from "next/link";
import { notFound } from "next/navigation";
import { fetchAnimeDetail } from "@/lib/anilist-detail";
import { fetchThemesFromJikan, youtubeSearchUrl } from "@/lib/jikan-themes";
import { AddToWatchlist } from "@/components/AddToWatchlist";
import { BingeCalculator } from "@/components/BingeCalculator";
import { AnimeNotes } from "@/components/AnimeNotes";
import { DetailAI } from "@/components/DetailAI";
import { AncestryGraph } from "@/components/AncestryGraph";
import { MemoryVisit } from "@/components/MemoryVisit";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ id: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const num = parseInt(id, 10);
  if (isNaN(num)) return { title: "Anime · AnimeNexus" };
  try {
    const anime = await fetchAnimeDetail(num);
    if (!anime) return { title: "Not found · AnimeNexus" };
    return {
      title: `${anime.title} · AnimeNexus`,
      description: anime.description.slice(0, 160),
    };
  } catch {
    return { title: "Anime · AnimeNexus" };
  }
}

function statusLabel(s: string) {
  const map: Record<string, string> = {
    FINISHED: "Finished",
    RELEASING: "Airing",
    NOT_YET_RELEASED: "Upcoming",
    CANCELLED: "Cancelled",
    HIATUS: "Hiatus",
  };
  return map[s] || s;
}

export default async function AnimeDetailPage({ params }: Props) {
  const { id } = await params;
  const num = parseInt(id, 10);
  if (isNaN(num)) notFound();

  let anime;
  try {
    anime = await fetchAnimeDetail(num);
  } catch {
    notFound();
  }
  if (!anime) notFound();

  const score = anime.score > 0 ? anime.score.toFixed(1) : "—";
  const season =
    anime.season && anime.seasonYear
      ? `${anime.season.charAt(0)}${anime.season.slice(1).toLowerCase()} ${anime.seasonYear}`
      : anime.year
        ? String(anime.year)
        : null;

  const youtube =
    anime.trailer?.site?.toLowerCase() === "youtube" && anime.trailer.id
      ? `https://www.youtube.com/embed/${anime.trailer.id}`
      : null;

  const epNum =
    typeof anime.episodes === "number"
      ? anime.episodes
      : parseInt(String(anime.episodes), 10) || 0;

  let themes: { openings: string[]; endings: string[] } | null = null;
  if (anime.idMal) {
    themes = await fetchThemesFromJikan(anime.idMal);
  }

  const relations = anime.relations || [];
  const relationsSummary = relations
    .map((r) => `${r.relationType}: ${r.title}`)
    .join("\n");

  const vtCover = `cover-${anime.id}`;

  return (
    <main>
      <MemoryVisit
        id={anime.id}
        title={anime.title}
        image={anime.image}
        genres={anime.tags}
        studios={anime.studios}
      />
      {anime.bannerImage ? (
        <div
          className="detail-banner"
          style={{ backgroundImage: `url(${anime.bannerImage})` }}
        />
      ) : (
        <div className="detail-banner detail-banner-empty" />
      )}

      <div className="container detail-wrap">
        <Link href="/browse" className="detail-back">
          ← Back to browse
        </Link>

        <div className="detail-hero">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            className="detail-cover"
            src={anime.image}
            alt=""
            style={{ viewTransitionName: vtCover } as React.CSSProperties}
          />

          <div className="detail-info">
            <p className="detail-kicker">Lantern · detail</p>
            <h1>{anime.title}</h1>
            {(anime.titleRomaji || anime.titleNative) &&
            (anime.titleRomaji !== anime.title || anime.titleNative) ? (
              <p className="detail-alt-titles">
                {[anime.titleRomaji, anime.titleNative]
                  .filter(Boolean)
                  .filter((t, i, a) => a.indexOf(t) === i && t !== anime.title)
                  .join(" · ")}
              </p>
            ) : null}

            <div className="detail-meta">
              <span className="detail-score">★ {score}</span>
              <span>{anime.format}</span>
              <span>{statusLabel(String(anime.status))}</span>
              {season ? <span>{season}</span> : null}
              {epNum > 0 ? <span>{epNum} ep</span> : null}
              {anime.duration > 0 ? <span>{anime.duration} min</span> : null}
            </div>

            {anime.tags?.length ? (
              <div className="detail-tags">
                {anime.tags.slice(0, 12).map((g) => (
                  <Link
                    key={g}
                    href={`/browse?genre=${encodeURIComponent(g)}`}
                    className="detail-tag"
                  >
                    {g}
                  </Link>
                ))}
              </div>
            ) : null}

            {anime.studios?.length ? (
              <p className="detail-studios">
                Studio{anime.studios.length > 1 ? "s" : ""}:{" "}
                <strong>{anime.studios.join(", ")}</strong>
              </p>
            ) : null}

            <AddToWatchlist anime={anime} />
            <div className="detail-actions" style={{ marginTop: 12 }}>
              {anime.url ? (
                <a
                  href={anime.url}
                  target="_blank"
                  rel="noreferrer"
                  className="btn btn-outline btn-sm"
                >
                  Open on AniList ↗
                </a>
              ) : null}
              <Link href="/watchlist" className="btn btn-outline btn-sm">
                Open watchlist
              </Link>
              <a href="#ancestry" className="btn btn-outline btn-sm">
                Ancestry
              </a>
            </div>
          </div>
        </div>

        <section className="detail-section">
          <h2>Synopsis</h2>
          <p className="detail-synopsis">
            {anime.description || "No description available."}
          </p>
        </section>

        <AncestryGraph
          centerTitle={anime.title}
          centerId={anime.id}
          centerImage={anime.image}
          centerYear={anime.year}
          relations={relations}
        />

        {youtube ? (
          <section className="detail-section">
            <h2>Trailer</h2>
            <div className="detail-trailer">
              <iframe
                src={youtube}
                title={`${anime.title} trailer`}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>
          </section>
        ) : null}

        <div className="detail-split">
          <BingeCalculator
            episodes={epNum}
            duration={anime.duration || 24}
            title={anime.title}
          />
          <AnimeNotes animeId={anime.id} />
        </div>

        {themes &&
        (themes.openings.length > 0 || themes.endings.length > 0) ? (
          <section className="detail-section">
            <h2>Themes (OP / ED)</h2>
            <div className="theme-lists">
              {themes.openings.length > 0 ? (
                <div>
                  <h3 className="theme-sub">Openings</h3>
                  <ul className="theme-ul">
                    {themes.openings.slice(0, 8).map((t) => (
                      <li key={t}>
                        <span>{t}</span>{" "}
                        <a
                          href={youtubeSearchUrl(t)}
                          target="_blank"
                          rel="noreferrer"
                        >
                          YouTube
                        </a>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
              {themes.endings.length > 0 ? (
                <div>
                  <h3 className="theme-sub">Endings</h3>
                  <ul className="theme-ul">
                    {themes.endings.slice(0, 8).map((t) => (
                      <li key={`ed-${t}`}>
                        <span>{t}</span>{" "}
                        <a
                          href={youtubeSearchUrl(t)}
                          target="_blank"
                          rel="noreferrer"
                        >
                          YouTube
                        </a>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </div>
          </section>
        ) : null}

        <DetailAI
          title={anime.title}
          synopsis={anime.description || ""}
          genres={anime.tags || []}
          relationsSummary={relationsSummary}
        />

        {anime.characters && anime.characters.length > 0 ? (
          <section className="detail-section">
            <h2>Characters</h2>
            <div className="char-grid">
              {anime.characters.map((c) => (
                <div key={c.id} className="char-card">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={
                      c.image ||
                      "https://placehold.co/120x120/1a1a1a/555?text=?"
                    }
                    alt=""
                  />
                  <div className="char-name">{c.name}</div>
                  <div className="char-role">{c.role.replace(/_/g, " ")}</div>
                </div>
              ))}
            </div>
          </section>
        ) : null}
      </div>
    </main>
  );
}
