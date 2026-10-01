"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { CSSProperties } from "react";
import type { Anime } from "@/lib/types";
import { AnimeImage } from "@/components/AnimeImage";
import { materialCssVars, materialFromAnimeEntity } from "@/lib/anime-material";
import { playCue } from "@/lib/sound-engine";

type Props = {
  anime: Anime;
  onClose: () => void;
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

export function AnimeUniversePortal({ anime, onClose }: Props) {
  const router = useRouter();
  const closeRef = useRef<HTMLButtonElement>(null);
  const worldRef = useRef<HTMLDivElement>(null);
  const rafRef = useRef(0);
  const [view, setView] = useState<PortalView>("entry");
  const [selectedCharacter, setSelectedCharacter] = useState<number | null>(null);

  const materialVars = useMemo(
    () => materialCssVars(materialFromAnimeEntity(anime)),
    [anime],
  );
  const backdrop = anime.bannerImage || anime.image;
  const characters = (anime.characters || []).filter((c) => c.image).slice(0, 8);
  const release = releaseLabel(anime);
  const description = cleanDescription(anime.description || "");
  const activeCharacter = characters.find((c) => c.id === selectedCharacter) || null;

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
        onClose();
      }
    };

    window.addEventListener("keydown", onKey);
    playCue("modal_open");

    return () => {
      window.clearTimeout(focusTimer);
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
  }, [anime.id]);

  function onPointerMove(event: React.PointerEvent<HTMLDivElement>) {
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
    playCue("filter_select");
  }

  function enterDossier() {
    playCue("filter_select");
    onClose();
    router.push(`/anime/${anime.id}`);
  }

  return (
    <div
      className="anime-universe-portal"
      role="dialog"
      aria-modal="true"
      aria-label={`${anime.title} universe`}
      style={materialVars as CSSProperties}
    >
      <button
        type="button"
        className="anime-universe-portal__backdrop"
        aria-label="Close universe"
        onClick={onClose}
      />

      <div
        ref={worldRef}
        className="anime-universe-portal__world"
        style={{ "--portal-image": `url("${backdrop}")` } as CSSProperties}
        onPointerMove={onPointerMove}
        onPointerLeave={resetPointer}
      >
        <div className="anime-universe-portal__atmosphere" aria-hidden />
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
            <span>LAT ${String(anime.id).padStart(6, "0")}</span>
            <i aria-hidden />
            <span>LIVE SIGNAL</span>
          </div>
          <button
            ref={closeRef}
            type="button"
            className="anime-universe-portal__close"
            onClick={onClose}
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

        <div className="anime-universe-portal__scene" aria-hidden>
          <div className="anime-universe-portal__scene-haze" />
          <div className="anime-universe-portal__art">
            <AnimeImage
              src={anime.image}
              title={anime.title}
              decorative
              width={900}
              height={1200}
              priority
              sizes="(max-width: 700px) 82vw, 68vw"
            />
          </div>
          <div className="anime-universe-portal__scene-caption">
            <span>KEY ART / MEMORY OBJECT</span>
            <span>{anime.titleNative || anime.titleRomaji || "ARCHIVE IMAGE"}</span>
          </div>
        </div>

        <main className="anime-universe-portal__main">
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
              <span>THE WORLD IS OPEN</span>
              <i aria-hidden />
              <span>LOOK CLOSER</span>
            </div>
          </div>

          <section className="anime-universe-portal__panel">
            {view === "entry" ? (
              <>
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
                  <button type="button" className="btn btn-outline" onClick={onClose}>
                    Return to discovery
                  </button>
                </div>
              </>
            ) : null}

            {view === "figures" ? (
              <div className="anime-universe-portal__figures">
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
              <div className="anime-universe-portal__archive">
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
          <span>ANIME ${String(anime.id).padStart(6, "0")}</span>
          <span>SCROLL / EXPLORE / ENTER</span>
        </footer>
      </div>
    </div>
  );
}
