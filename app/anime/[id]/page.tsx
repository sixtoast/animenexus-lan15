import "./detail.css";
import "../../detail-trailer.css";
import "../../watchlist-queue.css";
import "../../franchise-path.css";
import "../../desk-notes.css";
import "./sprint-b-detail.css";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getAnimeExperience } from "@/lib/anime-experience";
import { fetchAnimeById } from "@/lib/anilist";
import { buildExternalLinks } from "@/lib/external-links";
import { enrichDeepFromAniDb } from "@/lib/providers/anidb";
import { enrichArtworkFromFanart } from "@/lib/providers/fanart";
import { buildCreativeDna, fullCreditLines } from "@/lib/creative-dna";
import { buildViewingContext } from "@/lib/viewing-context";
import { resolveMangaSourcesFromRelations } from "@/lib/manga-adapter";
import { AddToWatchlist } from "@/components/AddToWatchlist";
import { AnimeImage } from "@/components/AnimeImage";
import { DetailCoverMaterial } from "@/components/DetailCoverMaterial";
import { BingeCalculator } from "@/components/BingeCalculator";
import { AnimeNotes } from "@/components/AnimeNotes";
import { DetailAI } from "@/components/DetailAI";
import { AncestryGraph } from "@/components/AncestryGraph";
import { DetailRelatedClient } from "@/components/DetailRelatedClient";
import { MemoryVisit } from "@/components/MemoryVisit";
import { EpisodeList } from "@/components/EpisodeList";
import { DeepSignalsPanel } from "@/components/DeepSignalsPanel";
import { CreativeDnaPanel } from "@/components/CreativeDnaPanel";
import { CreativeConnectionsPanel } from "@/components/CreativeConnectionsPanel";
import { WhereToWatch } from "@/components/WhereToWatch";
import { ArtworkGallery } from "@/components/ArtworkGallery";
import { ViewingContextPanel } from "@/components/ViewingContextPanel";
import { RewatchPanel } from "@/components/RewatchPanel";
import { MangaSourcePanel } from "@/components/MangaSourcePanel";
import { DetailTrailer } from "@/components/DetailTrailer";
import { DetailDeferred } from "@/components/DetailDeferred";
import { StudioLinks } from "@/components/StudioLinks";
import { FranchisePathPanel } from "@/components/FranchisePathPanel";
import { DeskNoteEditor } from "@/components/DeskNoteEditor";
import { ShareTitleButton } from "@/components/ShareTitleButton";
import { QuickOutcomeControls } from "@/components/QuickOutcomeControls";
import { formatAirTime } from "@/lib/radar-schedule";
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
    const anime = await fetchAnimeById(num);
    if (!anime) return { title: "Not found · AnimeNexus" };
    return {
      title: `${anime.title} · AnimeNexus`,
      description: (anime.description || "").slice(0, 160),
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

  const exp = await getAnimeExperience(num);
  if (!exp) notFound();

  const { anime, themes, jikan, nextEpisode, layers, identity } = exp;

  const deep = await enrichDeepFromAniDb(identity).catch(() => null);
  const fanart = await enrichArtworkFromFanart(identity).catch(() => null);

  const relations = anime.relations || [];
  const mangaSources = await resolveMangaSourcesFromRelations(relations).catch(
    () => [],
  );

  const viewingContext = buildViewingContext({
    title: anime.title,
    year: anime.year,
    season: anime.season,
    seasonYear: anime.seasonYear,
    format: anime.format,
    status: String(anime.status),
    studios: anime.studios,
    episodes: anime.episodes,
  });

  const dnaSlots = buildCreativeDna({
    staff: jikan.staff.map((s) => ({
      name: s.name,
      roles: s.roles,
      source: "jikan",
    })),
    production: deep?.production,
    creators: deep?.creators,
    studios: anime.studios,
  });
  const dnaFull = fullCreditLines({
    staff: jikan.staff.map((s) => ({
      name: s.name,
      roles: s.roles,
      source: "jikan",
    })),
    production: deep?.production,
    creators: deep?.creators,
  });

  const score = anime.score > 0 ? anime.score.toFixed(1) : "—";
  const season =
    anime.season && anime.seasonYear
      ? `${anime.season.charAt(0)}${anime.season.slice(1).toLowerCase()} ${anime.seasonYear}`
      : anime.year
        ? String(anime.year)
        : null;

  const epNum =
    typeof anime.episodes === "number"
      ? anime.episodes
      : parseInt(String(anime.episodes), 10) || 0;

  const external = buildExternalLinks(anime);
  const relationsSummary = relations
    .map((r) => `${r.relationType}: ${r.title}`)
    .join("\n");

  const vtCover = `cover-${anime.id}`;
  const showJikanChars =
    (!anime.characters || anime.characters.length === 0) &&
    jikan.characters.length > 0;

  const hasThemes =
    themes &&
    (themes.openings.length > 0 ||
      themes.endings.length > 0 ||
      (themes.inserts && themes.inserts.length > 0));

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
          <DetailCoverMaterial anime={anime} viewTransitionName={vtCover} />

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
              {anime.source && anime.source !== "anilist" ? (
                <span className="detail-source">via {anime.source}</span>
              ) : null}
            </div>

            {nextEpisode && (nextEpisode.subAt || nextEpisode.rawAt) ? (
              <p className="tools-hint" style={{ marginTop: 8 }}>
                Next air
                {nextEpisode.episode != null
                  ? ` · Ep ${nextEpisode.episode}`
                  : ""}
                {nextEpisode.subAt
                  ? ` · SUB ${formatAirTime(nextEpisode.subAt)}`
                  : nextEpisode.rawAt
                    ? ` · RAW ${formatAirTime(nextEpisode.rawAt)}`
                    : ""}
                {" · source: AnimeSchedule"}
              </p>
            ) : null}

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
              <StudioLinks studios={anime.studios} />
            ) : null}

            <AddToWatchlist anime={anime} />
            <QuickOutcomeControls animeId={anime.id} surface="detail" />
            <div className="detail-actions" style={{ marginTop: 12 }}>
              <Link href="/watchlist" className="btn btn-outline btn-sm">
                Open watchlist
              </Link>
              <ShareTitleButton title={anime.title} animeId={anime.id} />
              <a href="#episodes" className="btn btn-outline btn-sm">
                Episodes
              </a>
              <a href="#ancestry" className="btn btn-outline btn-sm">
                Ancestry
              </a>
              <a href="#external-links" className="btn btn-outline btn-sm">
                External
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

        <ViewingContextPanel context={viewingContext} />

        <MangaSourcePanel links={mangaSources} />

        <WhereToWatch animeId={anime.id} title={anime.title} />

        <DeepSignalsPanel
          genres={anime.tags || []}
          deepTags={deep?.tags || []}
          sourceNote={deep?.tags?.length ? "AniDB" : undefined}
        />

        <DetailDeferred
          title="Creative DNA"
          note="Staff, production roles — expand when you want depth."
        >
          <CreativeDnaPanel slots={dnaSlots} fullCredits={dnaFull} />
        </DetailDeferred>

        <CreativeConnectionsPanel dna={dnaSlots} currentId={anime.id} />

        {fanart?.assets?.length ? (
          <DetailDeferred
            title="Artwork gallery"
            note="Fan art & key visuals — expand on demand."
          >
            <ArtworkGallery
              assets={fanart.assets}
              sourceNote="fanart.tv (TVDB)"
            />
          </DetailDeferred>
        ) : null}

        {external.length > 0 ? (
          <section className="detail-section" id="external-links">
            <h2>External catalogs</h2>
            <p className="tools-hint" style={{ marginBottom: 10 }}>
              Only links backed by known ids — no guessed pages.
            </p>
            <div className="detail-actions" style={{ flexWrap: "wrap", gap: 8 }}>
              {external.map((l) => (
                <a
                  key={l.href}
                  href={l.href}
                  target="_blank"
                  rel="noreferrer"
                  className="btn btn-outline btn-sm"
                >
                  {l.label} ↗
                </a>
              ))}
            </div>
          </section>
        ) : null}

        <EpisodeList
          episodes={jikan.episodes}
          sourceNote={
            layers.jikanEpisodes
              ? "Source: Jikan / MAL — titles only when provided."
              : undefined
          }
        />

        <DetailRelatedClient
          relations={relations}
          centerTitle={anime.title}
        />

        <FranchisePathPanel
          centerId={anime.id}
          centerTitle={anime.title}
          centerYear={anime.year}
          centerFormat={String(anime.format || "")}
          relations={relations}
        />

        <div id="ancestry">
          <DetailDeferred
            title="Ancestry graph"
            note="Relations map — expand when exploring the franchise."
          >
            <AncestryGraph
              centerTitle={anime.title}
              centerId={anime.id}
              centerImage={anime.image}
              centerYear={anime.year}
              relations={relations}
            />
          </DetailDeferred>
        </div>

        {anime.trailer?.site?.toLowerCase() === "youtube" && anime.trailer.id ? (
          <DetailTrailer
            videoId={anime.trailer.id}
            title={anime.title}
            thumbnail={anime.trailer.thumbnail}
          />
        ) : null}

        <div className="detail-split">
          <BingeCalculator
            episodes={epNum}
            duration={anime.duration || 24}
            title={anime.title}
            malId={anime.idMal}
          />
          <AnimeNotes animeId={anime.id} />
        </div>

        <RewatchPanel
          animeId={anime.id}
          title={anime.title}
          image={anime.image}
        />

        <DeskNoteEditor animeId={anime.id} title={anime.title} />

        {hasThemes ? (
          <section className="detail-section">
            <h2>Themes (OP / ED / IN)</h2>
            <p className="tools-hint" style={{ marginBottom: 10 }}>
              Sources: {themes!.sourceNote}. Links open external sites.
            </p>
            <div className="theme-lists">
              {themes!.openings.length > 0 ? (
                <div>
                  <h3 className="theme-sub">Openings</h3>
                  <ul className="theme-ul">
                    {themes!.openings.map((t) => (
                      <li key={t.label}>
                        <span>{t.label}</span>
                        {t.episodeRange ? (
                          <span className="tools-hint"> · ep {t.episodeRange}</span>
                        ) : null}{" "}
                        {t.animethemesUrl ? (
                          <a
                            href={t.animethemesUrl}
                            target="_blank"
                            rel="noreferrer"
                          >
                            AnimeThemes
                          </a>
                        ) : null}{" "}
                        <a
                          href={t.youtubeSearch}
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
              {themes!.endings.length > 0 ? (
                <div>
                  <h3 className="theme-sub">Endings</h3>
                  <ul className="theme-ul">
                    {themes!.endings.map((t) => (
                      <li key={`ed-${t.label}`}>
                        <span>{t.label}</span>
                        {t.episodeRange ? (
                          <span className="tools-hint"> · ep {t.episodeRange}</span>
                        ) : null}{" "}
                        {t.animethemesUrl ? (
                          <a
                            href={t.animethemesUrl}
                            target="_blank"
                            rel="noreferrer"
                          >
                            AnimeThemes
                          </a>
                        ) : null}{" "}
                        <a
                          href={t.youtubeSearch}
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
              {themes!.inserts && themes!.inserts.length > 0 ? (
                <div>
                  <h3 className="theme-sub">Inserts</h3>
                  <ul className="theme-ul">
                    {themes!.inserts.map((t) => (
                      <li key={`in-${t.label}`}>
                        <span>{t.label}</span>
                        {t.episodeRange ? (
                          <span className="tools-hint"> · ep {t.episodeRange}</span>
                        ) : null}{" "}
                        {t.animethemesUrl ? (
                          <a
                            href={t.animethemesUrl}
                            target="_blank"
                            rel="noreferrer"
                          >
                            AnimeThemes
                          </a>
                        ) : null}{" "}
                        <a
                          href={t.youtubeSearch}
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

        <DetailDeferred
          title="Lantern AI notes"
          note="Optional AI panel — expand on demand."
        >
          <DetailAI
            title={anime.title}
            synopsis={anime.description || ""}
            genres={anime.tags || []}
            relationsSummary={relationsSummary}
          />
        </DetailDeferred>

        {anime.characters && anime.characters.length > 0 ? (
          <section className="detail-section">
            <h2>Characters</h2>
            <div className="char-grid">
              {anime.characters.map((c) => (
                <div key={c.id} className="char-card">
                  <AnimeImage
                    src={c.image}
                    title={c.name}
                    decorative
                    width={120}
                    height={120}
                    aspect="1 / 1"
                    sizes="80px"
                  />
                  <div className="char-name">{c.name}</div>
                  <div className="char-role">{c.role.replace(/_/g, " ")}</div>
                </div>
              ))}
            </div>
          </section>
        ) : showJikanChars ? (
          <section className="detail-section">
            <h2>Characters</h2>
            <p className="tools-hint" style={{ marginBottom: 10 }}>
              Source: Jikan / MAL (AniList characters unavailable)
            </p>
            <div className="char-grid">
              {jikan.characters.map((c) => (
                <div key={c.malId} className="char-card">
                  <AnimeImage
                    src={c.image}
                    title={c.name}
                    decorative
                    width={120}
                    height={120}
                    aspect="1 / 1"
                    sizes="80px"
                  />
                  <div className="char-name">{c.name}</div>
                  <div className="char-role">{c.role}</div>
                </div>
              ))}
            </div>
          </section>
        ) : null}

        <div className="detail-mobile-sticky" aria-label="Quick actions">
          <ShareTitleButton title={anime.title} animeId={anime.id} />
          <Link href="/watchlist" className="btn btn-accent btn-sm">
            Watchlist
          </Link>
        </div>
      </div>
    </main>
  );
}
