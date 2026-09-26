"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import type { Anime } from "@/lib/types";
import { useHomePersonalizedPool } from "@/lib/use-home-personalized-pool";

type Props = { candidates: Anime[] };

const positions = [
  { x: "9%", y: "19%" }, { x: "78%", y: "14%" }, { x: "2%", y: "51%" },
  { x: "82%", y: "50%" }, { x: "17%", y: "76%" }, { x: "69%", y: "78%" }, { x: "50%", y: "4%" },
];

function connectionPoints(index: number) {
  const points = [
    ["50","50","18","27"],["50","50","82","22"],["50","50","13","59"],["50","50","87","58"],
    ["50","50","24","82"],["50","50","75","82"],["50","50","50","10"],
  ];
  return points[index] ?? points[0];
}

function sharedDNA(current: Anime, other: Anime) {
  const currentTags = new Set([current.genre, ...current.tags].filter(Boolean).map((tag) => tag.toLowerCase()));
  const shared = [other.genre, ...other.tags]
    .filter(Boolean)
    .filter((tag, index, all) => all.indexOf(tag) === index)
    .filter((tag) => currentTags.has(tag.toLowerCase()))
    .slice(0, 2);
  return shared.length ? shared.join(" · ") : other.genre || "ADJACENT WORLD";
}

function eventRotation(field: HTMLDivElement | null) {
  if (!field) return 0;
  const pointer = field.dataset.orbitDrag;
  return pointer ? Number(pointer) : 0;
}

export function NexusWorlds({ candidates }: Props) {
  const { surprise, ready, entries } = useHomePersonalizedPool(candidates, 140);
  // Discovery Field deliberately consumes the same ranked Surprise Me stream.
  const worlds = (surprise.length ? surprise : candidates).slice(0, 7);
  const [active, setActive] = useState<number | null>(null);
  const [armed, setArmed] = useState<number | null>(null);
  const [secret, setSecret] = useState(false);
  const [entered, setEntered] = useState(false);
  const fieldRef = useRef<HTMLDivElement>(null);
  const pointerRef = useRef({ x: 0, y: 0, active: false });
  const dragRef = useRef({ active: false, startX: 0, startRotation: 0 });

  useEffect(() => {
    const field = fieldRef.current;
    if (!field) return;

    const setPointer = (clientX: number, clientY: number) => {
      const rect = field.getBoundingClientRect();
      const x = ((clientX - rect.left) / rect.width - 0.5) * 2;
      const y = ((clientY - rect.top) / rect.height - 0.5) * 2;
      pointerRef.current = { x, y, active: true };
      if (dragRef.current.active) {
        const delta = clientX - dragRef.current.startX;
        field.dataset.orbitDrag = (dragRef.current.startRotation + delta * 0.004).toFixed(4);
      }
      field.style.setProperty("--world-pointer-x", x.toFixed(3));
      field.style.setProperty("--world-pointer-y", y.toFixed(3));
    };

    const onPointerMove = (event: PointerEvent) => {
      if (event.pointerType === "mouse" || event.pointerType === "pen") {
        setPointer(event.clientX, event.clientY);
      }
    };
    const onPointerLeave = () => {
      pointerRef.current.active = false;
      field.style.setProperty("--world-pointer-x", "0");
      field.style.setProperty("--world-pointer-y", "0");
    };
    const onPointerDown = (event: PointerEvent) => {
      if (event.pointerType === "mouse" && event.button !== 0) return;
      const current = Number(field.dataset.orbitRotation || "0");
      dragRef.current = { active: true, startX: event.clientX, startRotation: current };
      field.setPointerCapture?.(event.pointerId);
      field.classList.add("is-dragging");
    };
    const onPointerUp = (event: PointerEvent) => {
      if (!dragRef.current.active) return;
      dragRef.current.active = false;
      field.releasePointerCapture?.(event.pointerId);
      field.classList.remove("is-dragging");
    };

    field.addEventListener("pointermove", onPointerMove);
    field.addEventListener("pointerleave", onPointerLeave);
    field.addEventListener("pointerdown", onPointerDown);
    field.addEventListener("pointerup", onPointerUp);
    field.addEventListener("pointercancel", onPointerUp);

    return () => {
      field.removeEventListener("pointermove", onPointerMove);
      field.removeEventListener("pointerleave", onPointerLeave);
      field.removeEventListener("pointerdown", onPointerDown);
      field.removeEventListener("pointerup", onPointerUp);
      field.removeEventListener("pointercancel", onPointerUp);
    };
  }, []);

  useEffect(() => {
    const field = fieldRef.current;
    if (!field) return;
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        setEntered(true);
        observer.disconnect();
      }
    }, { threshold: 0.18 });
    observer.observe(field);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!entered) return;
    const field = fieldRef.current;
    if (!field) return;

    const nodes = Array.from(field.querySelectorAll<HTMLElement>(".nexus-world-node"));
    if (!nodes.length) return;

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const mobile = window.matchMedia("(max-width: 700px)").matches;
    const rect = field.getBoundingClientRect();
    const centreX = rect.width / 2;
    const centreY = rect.height / 2;
    const spacing = mobile ? 52 : 108;
    const lineupY = rect.height * (mobile ? 0.44 : 0.48);
    const lineupDuration = mobile ? 1050 : 1200;
    const travelDuration = mobile ? 1500 : 1750;
    const orbitDuration = mobile ? 30000 : 36000;
    const delayStep = mobile ? 70 : 90;
    let raf = 0;
    const started = performance.now();

    const geometry = nodes.map((node, index) => {
      const w = node.offsetWidth;
      const h = node.offsetHeight;
      const baseX = node.offsetLeft + w / 2;
      const baseY = node.offsetTop + h / 2;
      const lineX = centreX + (index - (nodes.length - 1) / 2) * spacing;
      const lineY = lineupY;
      const maxX = Math.max(28, rect.width / 2 - w / 2 - (mobile ? 5 : 12));
      const maxY = Math.max(42, rect.height / 2 - h / 2 - (mobile ? 14 : 22));
      return { node, index, baseX, baseY, lineX, lineY, maxX, maxY, phase: (index / nodes.length) * Math.PI * 2 };
    });

    const radiusX = Math.min(...geometry.map(g => g.maxX), rect.width * (mobile ? 0.44 : 0.46));
    const radiusY = Math.min(...geometry.map(g => g.maxY), rect.height * (mobile ? 0.36 : 0.40));

    geometry.forEach(({ node }) => {
      const motion = node.querySelector<HTMLElement>(".nexus-world-node-motion");
      const orbit = node.querySelector<HTMLElement>(".nexus-world-node-orbit-motion");
      if (!motion || !orbit) return;
      motion.style.animation = "none";
      motion.style.opacity = "1";
      motion.style.transform = "none";
      orbit.style.animation = "none";
      orbit.style.transform = "translate3d(0,0,0) scale(1) rotateZ(0deg)";
    });

    const ease = (t: number) => 1 - Math.pow(1 - t, 3);

    const tick = (now: number) => {
      const elapsed = now - started;

      geometry.forEach(({ node, index, baseX, baseY, lineX, lineY, phase }) => {
        const orbit = node.querySelector<HTMLElement>(".nexus-world-node-orbit-motion");
        if (!orbit) return;

        const local = Math.max(0, elapsed - index * delayStep);
        const pointer = pointerRef.current;
        const pointerX = pointer.active ? pointer.x : 0;
        const pointerY = pointer.active ? pointer.y : 0;
        let x = lineX - baseX;
        let y = lineY - baseY;
        let rotation = index % 2 === 0 ? -28 : 28;
        let rotateX = 0;
        let rotateY = 0;
        let scale = 0.82;
        let depth = 0.5;

        if (local >= lineupDuration) {
          const travelT = Math.min(1, (local - lineupDuration) / travelDuration);
          const p = ease(travelT);
          const angle = phase;
          const targetX = centreX + Math.cos(angle) * radiusX - baseX;
          const targetY = centreY + Math.sin(angle) * radiusY - baseY;
          x = lineX - baseX + (targetX - (lineX - baseX)) * p;
          y = lineY - baseY + (targetY - (lineY - baseY)) * p;
          rotation = (index % 2 === 0 ? -1 : 1) * (28 * (1 - p) + Math.cos(angle) * 2.2 * p);
          scale = 0.82 + 0.10 * p;

          if (travelT >= 1) {
            const orbitT = (local - lineupDuration - travelDuration) / orbitDuration;
            const dragRotation = dragRef.current.active
              ? (eventRotation(fieldRef.current) - 0)
              : 0;
            const a = phase + orbitT * Math.PI * 2 + dragRotation;
            const dynamicRadiusX = radiusX * (1 - Math.abs(pointerX) * 0.035);
            const dynamicRadiusY = radiusY * (1 - Math.abs(pointerY) * 0.025);
            const fieldCentreX = centreX + pointerX * 18;
            const fieldCentreY = centreY + pointerY * 12;
            x = fieldCentreX + Math.cos(a) * dynamicRadiusX - baseX;
            y = fieldCentreY + Math.sin(a) * dynamicRadiusY - baseY;
            depth = (Math.sin(a) + 1) / 2;
            scale = 0.90 + depth * 0.12;
            rotation = Math.cos(a) * 2.2;
            rotateY = Math.sin(a) * 7 + pointerX * 2.5;
            rotateX = -Math.cos(a) * 4 + pointerY * -2.2;
            node.style.setProperty("--orbit-depth", depth.toFixed(3));
            node.style.setProperty("--orbit-angle", a.toFixed(3));
          }
        }

        orbit.style.transform = `translate3d(${x.toFixed(2)}px,${y.toFixed(2)}px,0) perspective(900px) rotateX(${rotateX.toFixed(2)}deg) rotateY(${rotateY.toFixed(2)}deg) scale(${scale.toFixed(3)}) rotateZ(${rotation.toFixed(2)}deg)`;
        if (local >= lineupDuration + travelDuration) {
          const a = phase + ((local - lineupDuration - travelDuration) / orbitDuration) * Math.PI * 2;
          node.style.zIndex = String(20 + Math.round(((Math.sin(a) + 1) / 2) * 20));
        } else {
          node.style.zIndex = String(30 + index);
        }
      });

      raf = window.requestAnimationFrame(tick);
    };

    if (reduceMotion) {
      geometry.forEach(({ node, baseX, baseY, phase }) => {
        const orbit = node.querySelector<HTMLElement>(".nexus-world-node-orbit-motion");
        if (!orbit) return;
        orbit.style.transform = `translate3d(${(centreX + Math.cos(phase) * radiusX - baseX).toFixed(2)}px,${(centreY + Math.sin(phase) * radiusY - baseY).toFixed(2)}px,0) scale(1) rotateZ(0deg)`;
      });
      return;
    }

    raf = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(raf);
  }, [entered, worlds.length]);

  if (!worlds.length) return null;

  const activeAnime = active === null ? null : worlds[active];
  const signalDNA = activeAnime ? [activeAnime.genre, ...activeAnime.tags].filter(Boolean).slice(0, 3).join(" · ") : "";
  const activeRelated = active === null
    ? []
    : worlds
        .map((anime, index) => ({ anime, index, dna: sharedDNA(activeAnime!, anime) }))
        .filter(({ index }) => index !== active)
        .slice(0, 3);

  return (
    <div
      ref={fieldRef}
      className={"nexus-world-map" + (entered ? " is-entered" : "") + (active !== null ? " has-active" : "") + (secret ? " has-secret" : "")}
      onMouseMove={(event) => {
        const rect = event.currentTarget.getBoundingClientRect();
        event.currentTarget.style.setProperty("--world-x", ((event.clientX - rect.left) / rect.width - 0.5) * 7 + "px");
        const px = (event.clientX - rect.left) / rect.width - 0.5;
        const py = (event.clientY - rect.top) / rect.height - 0.5;
        event.currentTarget.style.setProperty("--world-y", py * 7 + "px");
        event.currentTarget.style.setProperty("--world-pointer-x", (px * 2).toFixed(3));
        event.currentTarget.style.setProperty("--world-pointer-y", (py * 2).toFixed(3));
      }}
      onMouseLeave={(event) => {
        event.currentTarget.style.setProperty("--world-x", "0px");
        event.currentTarget.style.setProperty("--world-y", "0px");
        event.currentTarget.style.setProperty("--world-pointer-x", "0");
        event.currentTarget.style.setProperty("--world-pointer-y", "0");
        setActive(null);
        setArmed(null);
      }}
    >
      <div className="nexus-world-grid" aria-hidden />
      <div className="nexus-world-scanline" aria-hidden />
      <div className="nexus-world-crosshair" aria-hidden />
      <svg className="nexus-world-connections" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden>
        {worlds.map((anime, index) => {
          const [x1, y1, x2, y2] = connectionPoints(index);
          return <line key={anime.id} x1={x1} y1={y1} x2={x2} y2={y2} className={active === index ? "is-active" : ""} />;
        })}
      </svg>

      <div className="nexus-world-core">
        <div className="nexus-world-core-ring" aria-hidden />
        <span>DISCOVERY FIELD · {String(worlds.length).padStart(2, "0")}</span>
        <strong>{secret ? <>Stray<br /><em>signal.</em></> : <>Worlds<br /><em>nearby.</em></>}</strong>
        <small>
          {activeAnime
            ? "Signal locked. Follow the thread."
            : secret
              ? "An unindexed route appeared inside the field."
              : "Adjacent titles detected around your current taste vector."}
        </small>
        <div className="nexus-world-core-status"><i /> {activeAnime ? "TRACKING" : secret ? "UNMAPPED" : "SCANNING"}</div>
        {activeAnime ? <span className="nexus-world-core-active">{activeAnime.title}</span> : null}
      </div>

      {activeAnime ? (
        <div className="nexus-world-readout" aria-live="polite">
          <span>SIGNAL {String((active ?? 0) + 1).padStart(2, "0")} / LOCKED</span>
          <strong>{activeAnime.title}</strong>
          <small>SIGNAL DNA · {signalDNA || "ADJACENT WORLD"}</small>
          <div className="nexus-world-readout-links">
            {activeRelated.map(({ anime, index, dna }) => (
              <button key={anime.id} type="button" onClick={() => setActive(index)}>
                <b>{anime.title}</b><i>{dna}</i>
              </button>
            ))}
          </div>
        </div>
      ) : null}

      <div className="nexus-world-field-note nexus-world-field-note--tl">{ready && entries.length >= 2 ? "SURPRISE FIELD / PERSONAL" : "SURPRISE FIELD / DISCOVERY"}</div>
      <button
        type="button"
        className="nexus-world-field-note nexus-world-field-note--br nexus-world-secret-trigger"
        onClick={() => setSecret((value) => !value)}
        aria-label="Reveal hidden discovery signal"
      >
        {secret ? "RETURN TO FIELD" : "SELECT A SIGNAL · FIND THE STRAY"}
      </button>

      {worlds.map((anime, index) => {
        const position = positions[index];
        const isActive = active === index;
        const isArmed = armed === index;
        return (
          <Link
            key={anime.id}
            href={"/anime/" + anime.id}
            className={"nexus-world-node nexus-world-node--" + (index + 1) + (isActive ? " is-active" : "") + (isArmed ? " is-armed" : "")}
            style={{ "--node-x": position.x, "--node-y": position.y } as React.CSSProperties}
            onMouseEnter={() => { setActive(index); setArmed(index); }}
            onFocus={() => { setActive(index); setArmed(index); }}
            onBlur={() => { setArmed(null); }}
            onClick={(event) => {
              if (armed !== index) {
                event.preventDefault();
                setArmed(index);
                setActive(index);
              }
            }}
            aria-label={"Explore " + anime.title}
          >
            <span className="nexus-world-node-motion">
              <span className="nexus-world-node-orbit-motion">
              <span className="nexus-world-node-art">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={anime.image} alt="" loading="lazy" />
                <b>{String(index + 1).padStart(2, "0")}</b>
                <span className="nexus-world-node-lock">{isActive ? "LOCKED" : "SIGNAL"}</span>
              </span>
              <span className="nexus-world-node-copy">
                <small>{anime.genre || "ADJACENT WORLD"}</small>
                <strong>{anime.title}</strong>
                <i>{anime.year || "—"} · ★ {anime.score > 0 ? anime.score.toFixed(1) : "—"}</i>
              </span>
              </span>
            </span>
          </Link>
        );
      })}
    </div>
  );
}
