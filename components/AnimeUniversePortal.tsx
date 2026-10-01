"use client";

import { useEffect, useMemo, useRef } from "react";
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
  const materialVars = useMemo(
    () => materialCssVars(materialFromAnimeEntity(anime)),
    [anime],
  );
  const backdrop = anime.bannerImage || anime.image;
  const characters = (anime.characters || []).filter((c) => c.image).slice(0, 5);
  const release = releaseLabel(anime);
  const description = cleanDescription(anime.description || "");

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
        className="anime-universe-portal__world"
        style={{ "--portal-image": `url("${backdrop}")` } as CSSProperties}
      >
        <div className="anime-universe-portal__image-wash" aria-hidden />
        <div className="anime-universe-portal__grain" aria-hidden />
        <div className="anime-universe-portal__scan" aria-hidden />

        <header className="anime-universe-portal__top">
          <div className="anime-universe-portal__index">
            <span>UNIVERSE</span>
            <strong>01</strong>
          </div>
          <div className="anime-universe-portal__signal">
            <i aria-hidden />
            <span>ANIME SIGNAL</span>
            <b>CONNECTED</b>
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

        <div className="anime-universe-portal__content">
          <div className="anime-universe-portal__art">
            <div className="anime-universe-portal__art-glow" aria-hidden />
            <AnimeImage
              src={anime.image}
              title={anime.title}
              decorative
              width={700}
              height={980}
              priority
              sizes="(max-width: 700px) 74vw, 42vw"
            />
            <div className="anime-universe-portal__art-caption">
              <span>KEY ART</span>
              <span>{anime.titleNative || anime.titleRomaji || "ARCHIVE IMAGE"}</span>
            </div>
          </div>

          <section className="anime-universe-portal__copy">
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

            <div className="anime-universe-portal__rule" />

            <div className="anime-universe-portal__facts">
              {anime.score > 0 ? <span><b>★ {anime.score.toFixed(1)}</b> SIGNAL</span> : null}
              {anime.year ? <span><b>{anime.year}</b> YEAR</span> : null}
              {anime.episodes ? <span><b>{anime.episodes}</b> EPISODES</span> : null}
              {release ? <span><b>{release}</b> RELEASE</span> : null}
            </div>

            <p className="anime-universe-portal__description">
              {description || "The archive has no synopsis for this title yet."}
            </p>

            {anime.tags?.length ? (
              <div className="anime-universe-portal__tags" aria-label="Genres">
                {anime.tags.slice(0, 5).map((tag) => <span key={tag}>{tag}</span>)}
              </div>
            ) : null}

            {characters.length ? (
              <div className="anime-universe-portal__characters">
                <div className="anime-universe-portal__section-label">
                  <span>02</span>
                  <b>FIGURES WITHIN</b>
                </div>
                <div className="anime-universe-portal__character-row">
                  {characters.map((character) => (
                    <div className="anime-universe-portal__character" key={character.id} title={character.name}>
                      <AnimeImage
                        src={character.image!}
                        title={character.name}
                        decorative
                        width={110}
                        height={110}
                        sizes="72px"
                      />
                      <span>{character.name}</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}

            <div className="anime-universe-portal__actions">
              <button type="button" className="btn btn-accent" onClick={enterDossier}>
                Enter full dossier <span>→</span>
              </button>
              <button type="button" className="btn btn-outline" onClick={onClose}>
                Return to discovery
              </button>
            </div>
          </section>
        </div>

        <footer className="anime-universe-portal__footer">
          <span>ANIMENEXUS / UNIVERSE ENTRY</span>
          <span>{String(anime.id).padStart(6, "0")}</span>
          <span>ARTWORK · SIGNAL · MEMORY</span>
        </footer>
      </div>
    </div>
  );
}
