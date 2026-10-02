"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { CSSProperties } from "react";
import type { Anime } from "@/lib/types";
import { AnimeImage } from "@/components/AnimeImage";
import { usePerformance } from "@/components/PerformanceProvider";
import { materialCssVars, materialFromAnimeEntity } from "@/lib/anime-material";
import { playCue, playSpatialTravel } from "@/lib/sound-engine";
import { getAnimeObjectId, getAnimeViewTransitionName, withViewTransition } from "@/lib/view-transition";

type Props = {
  anime: Anime;
  sourceRect?: { x: number; y: number; width: number; height: number } | null;
  onClose: () => void;
  onEnterDossier?: () => void;
};

type PortalView = "entry" | "figures" | "archive";

const MONTHS = ["JAN","FEB","MAR","APR","MAY","JUN","JUL","AUG","SEP","OCT","NOV","DEC"];

function releaseLabel(anime: Anime) {
  const d = anime.releaseDate;
  if (!d?.year) return anime.status === "NOT_YET_RELEASED" ? "DATE TBA" : "";
  if (d.month && d.day) return `${String(d.day).padStart(2, "0")} ${MONTHS[d.month - 1]} ${d.year}`;
  if (d.month) return `${MONTHS[d.month - 1]} ${d.year}`;
  return String(d.year);
}

function cleanDescription(value: string) {
  return value.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
}

function AnimeUniversePortalScene({ anime, sourceRect, onClose, onEnterDossier }: Props) {
  const router = useRouter();
  const closeRef = useRef<HTMLButtonElement>(null);
  const worldRef = useRef<HTMLDivElement>(null);
  const rafRef = useRef(0);
  const [view, setView] = useState<PortalView>("entry");
  const [selectedCharacter, setSelectedCharacter] = useState<number | null>(null);
  const [isExiting, setIsExiting] = useState(false);
  const [showSecondaryFigure, setShowSecondaryFigure] = useState(false);
  const isMobileViewport = typeof window !== "undefined" && window.innerWidth <= 700;
  const performance = usePerformance();

  const materialVars = useMemo(
    () => materialCssVars(materialFromAnimeEntity(anime)),
    [anime],
  );
  const backdrop = isMobileViewport ? anime.image : (anime.bannerImage || anime.image);
  const characters = (anime.characters || []).filter((c) => c.image).slice(0, 8);
  const release = releaseLabel(anime);
  const description = cleanDescription(anime.description || "");
  const activeCharacter = characters.find((c) => c.id === selectedCharacter) || null;
  const viewportWidth = typeof window !== "undefined" ? window.innerWidth : 1440;
  const viewportHeight = typeof window !== "undefined" ? window.innerHeight : 900;
  const source = sourceRect ?? { x: viewportWidth / 2 - 80, y: viewportHeight / 2 - 120, width: 160, height: 240 };
  const portalVars = {
    ...materialVars,
    "--portal-source-x": `${source.x}px`,
    "--portal-source-y": `${source.y}px`,
    "--portal-source-w": `${source.width}px`,
    "--portal-source-h": `${source.height}px`,
    "--portal-source-cx": `${source.x + source.width / 2 - 12}px`,
    "--portal-source-cy": `${source.y + source.height / 2 - 12}px`,
    "--portal-source-scale": `${Math.max(.12, Math.min(.42, source.width / 520))}`,
  } as CSSProperties;

  const requestClose = () => {
    if (isExiting) return;
    setIsExiting(true);
    if (!isMobileViewport) playCue("modal_close", { gain: 0.62 });
    window.setTimeout(onClose, 420);
  };

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    const previousPosition = document.body.style.position;
    const previousTop = document.body.style.top;
    const previousWidth = document.body.style.width;
    const scrollY = window.scrollY;

    document.body.style.overflow = "hidden";
    document.body.style.position = "fixed";
    document.body.style.top = `-${scrollY}px`;
    document.body.style.width = "100%";

    const focusTimer = window.setTimeout(() => closeRef.current?.focus({ preventScroll: true }), 60);
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        requestClose();
      }
    };

    window.addEventListener("keydown", onKey);
    if (!isMobileViewport) {
      playCue("modal_open", { gain: 0.72 });
      // The source card hands its position to the portal as a short spatial travel cue.
      const sourceX = (source.x + source.width / 2) / window.innerWidth;
      playSpatialTravel(sourceX * 2 - 1, 0.65);
    }
    const arrivalTimer = isMobileViewport ? undefined : window.setTimeout(() => playCue("resonance", { gain: 0.48 }), 760);

    return () => {
      window.clearTimeout(focusTimer);
      if (arrivalTimer !== undefined) window.clearTimeout(arrivalTimer);
      cancelAnimationFrame(rafRef.current);
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = previousOverflow;
      document.body.style.position = previousPosition;
      document.body.style.top = previousTop;
      document.body.style.width = previousWidth;
      window.scrollTo({ top: scrollY, behavior: "auto" });
    };
  }, [onClose]);

  useEffect(() => {
    setView("entry");
    setSelectedCharacter(null);
    setShowSecondaryFigure(false);
    const timer = window.setTimeout(() => setShowSecondaryFigure(true), 900);
    return () => window.clearTimeout(timer);
  }, [anime.id]);

  function onPointerMove(event: React.PointerEvent<HTMLDivElement>) {
    if (!performance.portalParallax || !performance.cinematic) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    if (!window.matchMedia("(hover: hover) and (pointer: fine)").matches) return;

    const el = worldRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const x = (event.clientX - rect.left) / rect.width - 0.5;
    const y = (event.clientY - rect.top) / rect.height - 0.5;

    cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(() => {
      el.style.setProperty("--portal-mx", x.toFixed(4));
      el.style.setProperty("--portal-my", y.toFixed(4));
    });
  }

  function resetPointer() {
    const el = worldRef.current;
    if (!el) return;
    cancelAnimationFrame(rafRef.current);
    el.style.setProperty("--portal-mx", "0");
    el.style.setProperty("--portal-my", "0");
  }

  function changeView(next: PortalView) {
    setView(next);
    setSelectedCharacter(null);
    if (!isMobileViewport) playCue("filter_select");
  }

  function enterDossier() {
    if (isExiting) return;
    if (!isMobileViewport) playCue("filter_select");
    setIsExiting(true);

    // The portal is the departure scene. Hand the same anime object identity
    // to the real detail route so the browser can morph the artwork instead
    // of replacing the portal with a conventional page jump.
    window.setTimeout(() => {
      if (onEnterDossier) {
        onEnterDossier();
        return;
      }
      withViewTransition(
        () => router.push(`/anime/${anime.id}`),
        {
          route: "anime-detail",
          origin: "card",
          destination: "hero",
          objectId: getAnimeObjectId(anime.id),
        },
      );
    }, 180);
  }

  return (
    <div
      className={`anime-universe-portal${isExiting ? " is-exiting" : ""}`}
      role="dialog"
      aria-modal="true"
      aria-label={`${anime.title} universe`}
      style={portalVars}
    >
      <button
        type="button"
        className="anime-universe-portal__backdrop"
        aria-label="Close universe"
        onClick={requestClose}
      />

      <div
        ref={worldRef}
        className="anime-universe-portal__world"
        style={{ "--portal-image": `url("${backdrop}")` } as CSSProperties}
        onPointerMove={onPointerMove}
        onPointerLeave={resetPointer}
      >
        <div className="anime-universe-portal__gate" aria-hidden>
          <div className="anime-universe-portal__gate-orbit anime-universe-portal__gate-orbit--a" />
          <div className="anime-universe-portal__gate-orbit anime-universe-portal__gate-orbit--b" />
          <div className="anime-universe-portal__gate-core">
            <div className="anime-universe-portal__gate-image" />
            <span className="anime-universe-portal__gate-cross" />
            <span className="anime-universe-portal__gate-label">OPENING UNIVERSE</span>
            <strong>{anime.title}</strong>
          </div>
        </div>
        <div className="anime-universe-portal__atmosphere" aria-hidden />
        <div className="anime-universe-portal__depth" aria-hidden>
          {!isMobileViewport ? <div className="portal-depth__banner" /> : null}
          {performance.portalCharacters && !isMobileViewport && characters[0]?.image ? (
            <div className="portal-depth__figure portal-depth__figure--primary">
              <AnimeImage src={characters[0].image} title={characters[0].name} decorative width={700} height={1000} sizes="48vw" />
            </div>
          ) : null}
          {!isMobileViewport && showSecondaryFigure && characters[1]?.image ? (
            <div className="portal-depth__figure portal-depth__figure--secondary">
              <AnimeImage src={characters[1].image} title={characters[1].name} decorative width={520} height={760} sizes="(max-width: 700px) 55vw, 34vw" />
            </div>
          ) : null}
          <div className="portal-depth__light" />
          <div className="portal-depth__particles" />
        </div>
        <div className="anime-universe-portal__image-wash" aria-hidden />
        <div className="anime-universe-portal__vignette" aria-hidden />
        <div className="anime-universe-portal__grain" aria-hidden />
        <div className="anime-universe-portal__scan" aria-hidden />

        <header className="anime-universe-portal__top">
          <div className="anime-universe-portal__brand">
            <span>ANIMENEXUS</span>
            <b>UNIVERSE ENTRY</b>
          </div>
          <div className="anime-universe-portal__coordinates">
            <span>LAT {String(anime.id).padStart(6, "0")}</span>
            <i aria-hidden />
            <span>LIVE SIGNAL</span>
          </div>
          <button
            ref={closeRef}
            type="button"
            className="anime-universe-portal__close"
            onClick={requestClose}
          >
            <span>EXIT</span>
            <b>×</b>
          </button>
        </header>

        <nav className="anime-universe-portal__nav" aria-label="Universe sections">
          {([
            ["entry", "01", "ENTRY"],
            ["figures", "02", "FIGURES"],
            ["archive", "03", "ARCHIVE"],
          ] as const).map(([key, number, label]) => (
            <button
              key={key}
              type="button"
              className={view === key ? "is-active" : ""}
              aria-pressed={view === key}
              onClick={() => changeView(key)}
            >
              <span>{number}</span>
              <b>{label}</b>
            </button>
          ))}
        </nav>

        <div className="anime-universe-portal__world-effects" aria-hidden>
          <span className="world-effect world-effect--ring-a" />
          <span className="world-effect world-effect--ring-b" />
          <span className="world-effect world-effect--beam" />
          <span className="world-effect world-effect--glow" />
        </div>
        <div className="anime-universe-portal__scene" aria-hidden>
          <div className="anime-universe-portal__scene-haze" />
          <div className="anime-universe-portal__art">
            <AnimeImage
              src={anime.image}
              title={anime.title}
              decorative
              width={900}
              height={1200}
              priority={!isMobileViewport}
              sizes="(max-width: 700px) 82vw, 68vw"
              viewTransitionName={getAnimeViewTransitionName(anime.id)}
            />
          </div>
        </div>

        <main className="anime-universe-portal__main">
          <div className="anime-universe-portal__world-marker" aria-hidden>
            <span>01</span>
            <i />
            <b>UNIVERSE</b>
          </div>

          <div className="anime-universe-portal__identity">
            <p className="anime-universe-portal__eyebrow">
              {anime.format || "TITLE"} · {anime.status === "RELEASING" ? "ON AIR" : anime.status === "NOT_YET_RELEASED" ? "INCOMING" : "ARCHIVED"}
            </p>
            <h1>{anime.title}</h1>
            {(anime.titleNative || anime.titleRomaji) && (
              <p className="anime-universe-portal__native">
                {[anime.titleNative, anime.titleRomaji]
                  .filter(Boolean)
                  .filter((v, i, a) => a.indexOf(v) === i && v !== anime.title)
                  .join(" · ")}
              </p>
            )}
            <div className="anime-universe-portal__identity-line">
              <span>WORLD / {anime.titleNative || anime.titleRomaji || "SIGNAL"}</span>
              <i aria-hidden />
              <span>{anime.year || "—"} / {anime.format || "TITLE"}</span>
            </div>
          </div>

          <section className="anime-universe-portal__panel">
            {view === "entry" ? (
              <div key="entry" className="portal-view-scene portal-view-scene--entry">
                <div className="anime-universe-portal__facts">
                  {anime.score > 0 ? <span><b>★ {anime.score.toFixed(1)}</b> SIGNAL</span> : null}
                  {anime.year ? <span><b>{anime.year}</b> YEAR</span> : null}
                  {anime.episodes ? <span><b>{anime.episodes}</b> EPISODES</span> : null}
                  {release ? <span><b>{release}</b> RELEASE</span> : null}
                </div>
                <p className="anime-universe-portal__description">
                  {description || "The archive has no synopsis for this title yet."}
                </p>
                <div className="anime-universe-portal__tags" aria-label="Genres">
                  {(anime.tags || []).slice(0, 5).map((tag) => <span key={tag}>{tag}</span>)}
                </div>
                <div className="anime-universe-portal__actions">
                  <button type="button" className="btn btn-accent" onClick={enterDossier}>
                    Enter full dossier <span>→</span>
                  </button>
                  <button type="button" className="btn btn-outline" onClick={requestClose}>
                    Return to discovery
                  </button>
                </div>
              </div>
            ) : null}

            {view === "figures" ? (
              <div key="figures" className="anime-universe-portal__figures portal-view-scene portal-view-scene--figures">
                <div className="anime-universe-portal__panel-heading">
                  <span>02 / FIGURES WITHIN</span>
                  <b>{characters.length ? `${characters.length} PRESENCES DETECTED` : "NO FIGURES INDEXED"}</b>
                </div>
                {characters.length ? (
                  <div className="anime-universe-portal__character-grid">
                    {characters.map((character) => (
                      <button
                        type="button"
                        className={selectedCharacter === character.id ? "is-selected" : ""}
                        key={character.id}
                        onClick={() => {
                          setSelectedCharacter(character.id);
                          playCue("filter_select");
                        }}
                        aria-pressed={selectedCharacter === character.id}
                      >
                        <AnimeImage
                          src={character.image!}
                          title={character.name}
                          decorative
                          width={160}
                          height={160}
                          sizes="(max-width: 700px) 24vw, 110px"
                        />
                        <span>{character.name}</span>
                      </button>
                    ))}
                  </div>
                ) : (
                  <p className="anime-universe-portal__empty">Character data has not been indexed for this universe.</p>
                )}
                {activeCharacter ? (
                  <div className="anime-universe-portal__character-focus">
                    <span>SELECTED FIGURE</span>
                    <strong>{activeCharacter.name}</strong>
                    <p>Open the full dossier to explore this character within the wider title.</p>
                  </div>
                ) : null}
              </div>
            ) : null}

            {view === "archive" ? (
              <div key="archive" className="anime-universe-portal__archive portal-view-scene portal-view-scene--archive">
                <div className="anime-universe-portal__panel-heading">
                  <span>03 / ARCHIVE SIGNAL</span>
                  <b>CATALOGUE MEMORY</b>
                </div>
                <div className="anime-universe-portal__archive-grid">
                  <div><span>FORMAT</span><strong>{anime.format || "—"}</strong></div>
                  <div><span>STATUS</span><strong>{anime.status || "—"}</strong></div>
                  <div><span>SCORE</span><strong>{anime.score > 0 ? anime.score.toFixed(1) : "—"}</strong></div>
                  <div><span>YEAR</span><strong>{anime.year || "—"}</strong></div>
                  <div><span>EPISODES</span><strong>{anime.episodes || "—"}</strong></div>
                  <div><span>RELEASE</span><strong>{release || "—"}</strong></div>
                </div>
                <div className="anime-universe-portal__tags anime-universe-portal__tags--archive">
                  {(anime.tags || []).map((tag) => <span key={tag}>{tag}</span>)}
                </div>
                <div className="anime-universe-portal__actions">
                  <button type="button" className="btn btn-accent" onClick={enterDossier}>
                    Enter full dossier <span>→</span>
                  </button>
                </div>
              </div>
            ) : null}
          </section>
        </main>

        <footer className="anime-universe-portal__footer">
          <span>ARTWORK / SIGNAL / MEMORY</span>
          <span>ANIME {String(anime.id).padStart(6, "0")}</span>
          <span>SCROLL / EXPLORE / ENTER</span>
        </footer>
      </div>
    </div>
  );
}

function MobileAnimeUniversePortal({ anime, onClose, onEnterDossier }: Props) {
  const [closing, setClosing] = useState(false);
  const performanceSettings = usePerformance();

  const goToDossier = () => {
    if (closing) return;
    setClosing(true);
    playCue("filter_select", { gain: 0.58 });
    window.setTimeout(() => {
      const navigate = () => {
        if (onEnterDossier) onEnterDossier();
        else window.history.pushState({}, "", `/anime/${anime.id}`);
      };
      if (typeof document === "undefined" || !(document as Document & { startViewTransition?: unknown }).startViewTransition) {
        navigate();
        return;
      }
      withViewTransition(navigate, {
        route: "anime-detail",
        origin: "card",
        destination: "hero",
        objectId: getAnimeObjectId(anime.id),
      });
    }, 220);
  };

  const close = () => {
    if (closing) return;
    setClosing(true);
    window.setTimeout(onClose, 260);
  };

  return (
    <div
      className={`anime-universe-mobile-portal${closing ? " is-closing" : ""}`}
      role="dialog"
      aria-modal="true"
      aria-label={`Opening ${anime.title}`}
      style={materialCssVars(materialFromAnimeEntity(anime))}
    >
      <button type="button" className="anime-universe-mobile-portal__backdrop" aria-label="Close" onClick={close} />
      <div className="anime-universe-mobile-portal__surface" role="presentation">
        <div className="anime-universe-mobile-portal__art">
          <AnimeImage
            src={anime.image}
            title={anime.title}
            decorative
            priority
            width={900}
            height={1200}
            sizes="100vw"
            viewTransitionName={getAnimeViewTransitionName(anime.id)}
          />
        </div>
        <div className="anime-universe-mobile-portal__shade" aria-hidden="true" />
        <div className="anime-universe-mobile-portal__vignette" aria-hidden="true" />
        {performanceSettings.portalGrain ? <div className="anime-universe-mobile-portal__grain" aria-hidden="true" /> : null}

        <header className="anime-universe-mobile-portal__top">
          <span>ANIMENEXUS / UNIVERSE</span>
          <button type="button" onClick={close} aria-label="Close">×</button>
        </header>

        <main className="anime-universe-mobile-portal__content">
          <p>{anime.format || "TITLE"} · {anime.status === "RELEASING" ? "ON AIR" : anime.status === "NOT_YET_RELEASED" ? "INCOMING" : "ARCHIVED"}</p>
          <h1>{anime.title}</h1>
          {anime.titleNative && anime.titleNative !== anime.title ? <span>{anime.titleNative}</span> : null}
          <div className="anime-universe-mobile-portal__facts">
            {anime.score > 0 ? <b>★ {anime.score.toFixed(1)}</b> : null}
            {anime.year ? <span>{anime.year}</span> : null}
            {anime.episodes ? <span>{anime.episodes} EP</span> : null}
          </div>
          <button type="button" className="btn btn-accent" onClick={goToDossier}>
            Continue to dossier <span>→</span>
          </button>
        </main>
      </div>
    </div>
  );
}

export function AnimeUniversePortal(props: Props) {
  const isMobile = typeof window !== "undefined" && window.matchMedia("(max-width: 700px)").matches;
  if (isMobile) return <MobileAnimeUniversePortal {...props} />;
  return <AnimeUniversePortalScene {...props} />;
}

