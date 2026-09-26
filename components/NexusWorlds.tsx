"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import type { Anime } from "@/lib/types";
import { getAnimeObjectId, withViewTransition } from "@/lib/view-transition";
import { useHomePersonalizedPool } from "@/lib/use-home-personalized-pool";
import { claimNexusCommand, getLastNexusCommand, onNexusSignal, readNexusFieldState, type NexusFieldMode } from "@/lib/nexus-intelligence";

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


export function NexusWorlds({ candidates }: Props) {
  const router = useRouter();
  const { pool, surprise, ready, entries } = useHomePersonalizedPool(candidates, 140);
  const initialFieldState = typeof window !== "undefined" ? readNexusFieldState() : null;
  const [fieldMode, setFieldMode] = useState<NexusFieldMode>(
    initialFieldState?.mode ?? "discovery",
  );
  const [commandLabel, setCommandLabel] = useState<string | null>(
    initialFieldState?.label ?? null,
  );
  // Recommendations and mood use the canonical ranked pool. Discovery keeps
  // the existing Surprise Me stream rather than introducing a second ranker.
  const worlds = (
    fieldMode === "recommendations" || fieldMode === "mood"
      ? (pool.length ? pool : candidates)
      : (surprise.length ? surprise : candidates)
  ).slice(0, 7);
  const [active, setActive] = useState<number | null>(null);
  const [armed, setArmed] = useState<number | null>(null);
  const [secret, setSecret] = useState(false);
  const [entered, setEntered] = useState(false);
  const fieldRef = useRef<HTMLDivElement>(null);
  const pointerRef = useRef({ x: 0, y: 0, active: false });
  const dragRef = useRef({ active: false, startX: 0, startRotation: 0 });

  useEffect(() => {
    const apply = (signal: ReturnType<typeof getLastNexusCommand>) => {
      if (!signal || signal.source !== "ai" || !claimNexusCommand(signal.id, "field")) return;
      const mode = signal.type === "focus"
        ? signal.target
        : signal.payload.mode;
      const valid: NexusFieldMode[] = [
        "discovery", "recommendations", "mood", "watchlist",
        "franchise", "artwork", "watch-order",
      ];
      if (typeof mode === "string" && valid.includes(mode as NexusFieldMode)) {
        setFieldMode(mode as NexusFieldMode);
      }
      const label =
        signal.type === "filter" && typeof signal.payload.label === "string"
          ? signal.payload.label
          : signal.type === "focus"
            ? ({
                discovery: "Discovery field focused",
                recommendations: "Recommendation field focused",
                mood: "Mood field focused",
                watchlist: "Watchlist constellation focused",
                franchise: "Franchise space focused",
                artwork: "Artwork space focused",
                "watch-order": "Watch order space focused",
              } as Record<NexusFieldMode, string>)[signal.target];
            : null;
      if (label) setCommandLabel(label);
    };

    apply(getLastNexusCommand());
    return onNexusSignal(apply);
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
    const travelLift = mobile ? 18 : 30;
    const travelArc = mobile ? 0.055 : 0.075;
    const delayStep = mobile ? 70 : 90;

    let raf = 0;
    let previousNow = performance.now();
    let orbitPhase = 0;
    let angularVelocity = 0;
    let lastDragTime = 0;
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
    const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));
    const ease = (t: number) => 1 - Math.pow(1 - t, 3);

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

    const onDragMove = (event: PointerEvent) => {
      const pointerRect = field.getBoundingClientRect();
      const pointerX = ((event.clientX - pointerRect.left) / pointerRect.width - 0.5) * 2;
      const pointerY = ((event.clientY - pointerRect.top) / pointerRect.height - 0.5) * 2;
      pointerRef.current = { x: pointerX, y: pointerY, active: true };
      field.style.setProperty("--world-pointer-x", pointerX.toFixed(3));
      field.style.setProperty("--world-pointer-y", pointerY.toFixed(3));
      field.style.setProperty("--world-x", (pointerX * 3.5).toFixed(2) + "px");
      field.style.setProperty("--world-y", (pointerY * 3.5).toFixed(2) + "px");
      if (!dragRef.current.active) return;
      const now = performance.now();
      const current = Number(field.dataset.orbitDrag || "0");
      const next = dragRef.current.startRotation + (event.clientX - dragRef.current.startX) * 0.004;
      const dt = Math.max(8, now - (lastDragTime || now - 16));
      angularVelocity = clamp(((next - current) / dt) * 1000, -1.6, 1.6);
      field.dataset.orbitDrag = next.toFixed(4);
      lastDragTime = now;
    };

    const onDragStart = (event: PointerEvent) => {
      if (event.pointerType === "mouse" && event.button !== 0) return;
      const target = event.target instanceof Element ? event.target : null;
      if (target?.closest("a,button,input,textarea,select")) return;
      const current = Number(field.dataset.orbitDrag || "0");
      dragRef.current = { active: true, startX: event.clientX, startRotation: current };
      lastDragTime = performance.now();
      angularVelocity = 0;
      field.setPointerCapture?.(event.pointerId);
      field.classList.add("is-dragging");
    };

    const onPointerLeave = () => {
      pointerRef.current.active = false;
      field.style.setProperty("--world-pointer-x", "0");
      field.style.setProperty("--world-pointer-y", "0");
      field.style.setProperty("--world-x", "0px");
      field.style.setProperty("--world-y", "0px");
      setActive(null);
      setArmed(null);
    };

    const onDragEnd = (event: PointerEvent) => {
      if (!dragRef.current.active) return;
      dragRef.current.active = false;
      field.releasePointerCapture?.(event.pointerId);
      field.classList.remove("is-dragging");
      angularVelocity = clamp(angularVelocity, -1.25, 1.25);
    };

    field.addEventListener("pointermove", onDragMove);
    field.addEventListener("pointerleave", onPointerLeave);
    field.addEventListener("pointerdown", onDragStart);
    field.addEventListener("pointerup", onDragEnd);
    field.addEventListener("pointercancel", onDragEnd);

    const tick = (now: number) => {
      const elapsed = now - started;
      const dt = Math.min(48, Math.max(8, now - previousNow));
      previousNow = now;

      if (dragRef.current.active) {
        orbitPhase = Number(field.dataset.orbitDrag || orbitPhase);
      } else if (Math.abs(angularVelocity) > 0.0008) {
        orbitPhase += angularVelocity * (dt / 1000);
        angularVelocity *= Math.pow(0.035, dt / 1000);
        field.dataset.orbitInertia = angularVelocity.toFixed(4);
      }

      const pointer = pointerRef.current;
      const pointerX = pointer.active ? pointer.x : 0;
      const pointerY = pointer.active ? pointer.y : 0;
      const lockTarget = Number(field.dataset.lockTarget ?? "-1");

      geometry.forEach(({ node, index, baseX, baseY, lineX, lineY, phase }) => {
        const orbit = node.querySelector<HTMLElement>(".nexus-world-node-orbit-motion");
        if (!orbit) return;

        const local = Math.max(0, elapsed - index * delayStep);
        let x = lineX - baseX;
        let y = lineY - baseY;
        let rotation = index % 2 === 0 ? -28 : 28;
        let rotateX = 0;
        let rotateY = 0;
        let scale = 0.82;
        let attraction = 0;
        let repulsion = 0;

        if (local >= lineupDuration) {
          const travelT = Math.min(1, (local - lineupDuration) / travelDuration);
          const p = ease(travelT);
          const angle = phase + orbitPhase;
          const targetX = centreX + Math.cos(angle) * radiusX - baseX;
          const targetY = centreY + Math.sin(angle) * radiusY - baseY;
          const startX = lineX - baseX;
          const startY = lineY - baseY;
          const travelX = startX + (targetX - startX) * p;
          const travelY = startY + (targetY - startY) * p;
          // A single spatial arc gives every card the same physical journey:
          // lineup -> lift/arc -> orbital destination. The sign only varies the
          // side of the arc, never the destination geometry.
          const arc = Math.sin(Math.PI * p) * travelArc * rect.height * (index % 2 === 0 ? -1 : 1);
          x = travelX;
          y = travelY - Math.sin(Math.PI * p) * travelLift + arc;
          rotation = (index % 2 === 0 ? -1 : 1) * (28 * (1 - p) + Math.cos(angle) * 2.2 * p);
          scale = 0.82 + 0.10 * p;

          if (travelT >= 1) {
            const orbitT = (local - lineupDuration - travelDuration) / orbitDuration;
            const a = phase + orbitT * Math.PI * 2 + orbitPhase;
            const dynamicRadiusX = radiusX * (1 - Math.abs(pointerX) * 0.035);
            const dynamicRadiusY = radiusY * (1 - Math.abs(pointerY) * 0.025);
            const fieldCentreX = centreX + pointerX * 18;
            const fieldCentreY = centreY + pointerY * 12;
            const orbitalX = fieldCentreX + Math.cos(a) * dynamicRadiusX;
            const orbitalY = fieldCentreY + Math.sin(a) * dynamicRadiusY;
            x = orbitalX - baseX;
            y = orbitalY - baseY;

            // The pointer creates a soft magnetic field around each signal.
            const pointerNX = pointerX * 0.5 + 0.5;
            const pointerNY = pointerY * 0.5 + 0.5;
            const dx = pointerNX - orbitalX / rect.width;
            const dy = pointerNY - orbitalY / rect.height;
            const distance = Math.hypot(dx, dy);

            if (pointer.active && distance < 0.30) {
              attraction = (1 - distance / 0.30) * (mobile ? 16 : 24);
              x += dx * attraction;
              y += dy * attraction;
            }
            if (pointer.active && distance < 0.12) {
              repulsion = (1 - distance / 0.12) * (mobile ? 12 : 18);
              const nx = distance > 0.001 ? dx / distance : Math.cos(a);
              const ny = distance > 0.001 ? dy / distance : Math.sin(a);
              x -= nx * repulsion;
              y -= ny * repulsion;
            }

            if (lockTarget === index) {
              const lockPulse = 0.5 + 0.5 * Math.sin(now * 0.005);
              x += pointerX * 5 * lockPulse;
              y += pointerY * 4 * lockPulse;
              scale += 0.045 + lockPulse * 0.025;
              rotateY += pointerX * 3;
              rotateX -= pointerY * 2;
            }

            const depth = (Math.sin(a) + 1) / 2;
            scale = Math.min(1.18, 0.90 + depth * 0.12 + attraction / (mobile ? 700 : 900));
            rotation = Math.cos(a) * 2.2;
            rotateY += Math.sin(a) * 7 + pointerX * 2.5;
            rotateX += -Math.cos(a) * 4 + pointerY * -2.2;
            node.style.setProperty("--orbit-depth", depth.toFixed(3));
            node.style.setProperty("--orbit-angle", a.toFixed(3));
            node.style.setProperty("--orbit-attraction", attraction.toFixed(2));
            node.style.setProperty("--orbit-repulsion", repulsion.toFixed(2));
          }
        }

        orbit.style.transform =
          `translate3d(${x.toFixed(2)}px,${y.toFixed(2)}px,0) perspective(900px) rotateX(${rotateX.toFixed(2)}deg) rotateY(${rotateY.toFixed(2)}deg) scale(${scale.toFixed(3)}) rotateZ(${rotation.toFixed(2)}deg)`;

        if (local >= lineupDuration + travelDuration) {
          const a = phase + ((local - lineupDuration - travelDuration) / orbitDuration) * Math.PI * 2 + orbitPhase;
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
        orbit.style.transform =
          `translate3d(${(centreX + Math.cos(phase) * radiusX - baseX).toFixed(2)}px,${(centreY + Math.sin(phase) * radiusY - baseY).toFixed(2)}px,0) scale(1)`;
      });
    } else {
      raf = window.requestAnimationFrame(tick);
    }

    return () => {
      window.cancelAnimationFrame(raf);
      field.removeEventListener("pointermove", onDragMove);
      field.removeEventListener("pointerleave", onPointerLeave);
      field.removeEventListener("pointerdown", onDragStart);
      field.removeEventListener("pointerup", onDragEnd);
      field.removeEventListener("pointercancel", onDragEnd);
    };
  }, [entered, worlds.length]);

  useEffect(() => {
    const field = fieldRef.current;
    if (!field) return;

    let raf = 0;
    const updateWorldProgress = () => {
      const rect = field.getBoundingClientRect();
      const viewport = window.innerHeight || 1;
      const progress = Math.max(0, Math.min(1, (viewport - rect.top) / (viewport + rect.height)));
      const edge = 1 - Math.min(1, Math.abs(progress - 0.5) * 2);
      field.style.setProperty("--world-scroll", progress.toFixed(3));
      field.style.setProperty("--world-scroll-edge", edge.toFixed(3));
    };
    const onScroll = () => {
      if (raf) return;
      raf = window.requestAnimationFrame(() => {
        raf = 0;
        updateWorldProgress();
      });
    };

    updateWorldProgress();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (raf) window.cancelAnimationFrame(raf);
    };
  }, []);

  if (!worlds.length) return null;

  const activeAnime = active === null ? null : worlds[active];
  const visibleCommand = commandLabel ?? intelligence;
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
      className={"nexus-world-map" + (entered ? " is-entered" : "") + (active !== null ? " has-active" : "") + (secret ? " has-secret" : "") + (commandLabel ? " is-ai-directed" : "")}
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

      {visibleCommand ? <div className="nexus-world-intelligence" aria-live="polite"><span>INTELLIGENCE</span><strong>{visibleCommand}</strong></div> : null}
      {visibleCommand ? <div className="nexus-world-command-receipt" aria-live="polite"><i /> <span>{visibleCommand}</span><b>SYNCED</b></div> : null}
      <div className="nexus-world-core">
        <div className="nexus-world-core-ring" aria-hidden />
        <span>DISCOVERY FIELD · {String(worlds.length).padStart(2, "0")}</span>
        <strong>{secret ? <>Stray<br /><em>signal.</em></> : fieldMode === "mood" ? <>Mood<br /><em>aligned.</em></> : fieldMode === "recommendations" ? <>Picks<br /><em>re-ranked.</em></> : <>Worlds<br /><em>nearby.</em></>}</strong>
        <small>
          {activeAnime
            ? "Signal locked. Follow the thread."
            : secret
              ? "An unindexed route appeared inside the field."
              : fieldMode === "mood"
              ? "The field is using your active viewing intent."
              : fieldMode === "recommendations"
                ? "The field is showing the canonical ranked recommendation stream."
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
            onMouseEnter={() => { setActive(index); setArmed(index); fieldRef.current?.setAttribute("data-lock-target", String(index)); }}
            onFocus={() => { setActive(index); setArmed(index); fieldRef.current?.setAttribute("data-lock-target", String(index)); }}
            onBlur={() => { setArmed(null); fieldRef.current?.setAttribute("data-lock-target", "-1"); }}
            onClick={(event) => {
              if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0) return;
              if (armed !== index) {
                event.preventDefault();
                setArmed(index);
                setActive(index);
                return;
              }
              event.preventDefault();
              withViewTransition(
                () => router.push("/anime/" + anime.id),
                {
                  route: "anime-detail",
                  origin: "node",
                  destination: "hero",
                  objectId: getAnimeObjectId(anime.id),
                },
              );
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
