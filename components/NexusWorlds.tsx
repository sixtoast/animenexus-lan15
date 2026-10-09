"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import type { Anime } from "@/lib/types";
import { getAnimeObjectId, getAnimeViewTransitionName, withViewTransition } from "@/lib/view-transition";
import { playInteractionSound } from "@/lib/sound-engine";
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
  const [inView, setInView] = useState(false);
  const [travelling, setTravelling] = useState<number | null>(null);
  const [aiPulse, setAiPulse] = useState(0);
  const [aiPulsing, setAiPulsing] = useState(false);
  const [fieldRevision, setFieldRevision] = useState(0);
  const aiPulseStartedRef = useRef(0);
  const fieldRef = useRef<HTMLDivElement>(null);
  const fieldModeRef = useRef(fieldMode);
  fieldModeRef.current = fieldMode;
  const pointerRef = useRef({ x: 0, y: 0, active: false });
  const dragRef = useRef({ active: false, startX: 0, startRotation: 0 });

  useEffect(() => {
    const apply = (signal: ReturnType<typeof getLastNexusCommand>) => {
      if (!signal || signal.source !== "ai" || !claimNexusCommand(signal.id, "field")) return;
      const mode = signal.type === "focus"
        ? signal.target
        : signal.type === "filter"
          ? signal.payload.mode
          : "discovery";
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
              } as Record<NexusFieldMode, string>)[signal.target]
            : null;
      if (label) setCommandLabel(label);
      if (signal.type === "filter" || signal.type === "focus" || signal.type === "travel") {
        aiPulseStartedRef.current = performance.now();
        setAiPulse((value) => value + 1);
        setAiPulsing(false);
        window.requestAnimationFrame(() => setAiPulsing(true));
      }
      // AI commands are intentionally quiet unless they materially reconfigure
      // the field. A single resonance marks the change; ordinary pointer/scroll
      // interaction remains silent.
      if (signal.type === "filter" || signal.type === "travel") {
        playInteractionSound("discovery", { gain: 0.42 });
      }
    };

    apply(getLastNexusCommand());
    return onNexusSignal(apply);
  }, []);

  useEffect(() => {
    const field = fieldRef.current;
    if (!field) return;
    const observer = new IntersectionObserver(([entry]) => {
      // Do not start the cinematic entrance in the preload margin. The field
      // must actually be on-screen before its clock begins, otherwise a slow
      // scroll can consume the entire LINEUP -> TRAVEL sequence off-screen.
      const visible = entry.isIntersecting && entry.intersectionRatio >= 0.2;
      setInView(visible);
      if (visible) setEntered(true);
    }, { threshold: [0, 0.2], rootMargin: "0px" });
    observer.observe(field);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!aiPulsing) return;
    const timer = window.setTimeout(() => setAiPulsing(false), 900);
    return () => window.clearTimeout(timer);
  }, [aiPulse, aiPulsing]);

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
    let pointerStyleRaf = 0;
    let pendingPointerX = 0;
    let pendingPointerY = 0;
    let previousNow = performance.now();
    let orbitPhase = 0;
    let angularVelocity = 0;
    let lastDragTime = 0;
    const started = performance.now();
    let arrivalCuePlayed = false;
    let phase: "lineup" | "travel" | "orbit" | "" = "";

    let motionAbort = false;

    const connectionLines = Array.from(field.querySelectorAll<SVGLineElement>('.nexus-world-connections line'));
    const geometry = nodes.map((node, index) => {
      const w = node.offsetWidth;
      const h = node.offsetHeight;
      const baseX = node.offsetLeft + w / 2;
      const baseY = node.offsetTop + h / 2;
      const lineX = centreX + (index - (nodes.length - 1) / 2) * spacing;
      const lineY = lineupY;
      const maxX = Math.max(28, rect.width / 2 - w / 2 - (mobile ? 5 : 12));
      const maxY = Math.max(42, rect.height / 2 - h / 2 - (mobile ? 14 : 22));
      const motion = node.querySelector<HTMLElement>(".nexus-world-node-motion");
      const orbit = node.querySelector<HTMLElement>(".nexus-world-node-orbit-motion");
      return { node, motion, orbit, index, baseX, baseY, lineX, lineY, maxX, maxY, phase: (index / nodes.length) * Math.PI * 2 };
    });

    const radiusX = Math.min(...geometry.map(g => g.maxX), rect.width * (mobile ? 0.44 : 0.46));
    const radiusY = Math.min(...geometry.map(g => g.maxY), rect.height * (mobile ? 0.36 : 0.40));
    const motionPositions = new Array<{ x: number; y: number }>(geometry.length);
    const rankDenominator = Math.max(1, nodes.length - 1);
    const modeTargets = new Map<NexusFieldMode, Array<{ x: number; y: number }>>();
    const modes: NexusFieldMode[] = ["discovery", "recommendations", "mood", "watchlist", "franchise", "artwork", "watch-order"];
    for (const mode of modes) {
      modeTargets.set(mode, nodes.map((_, index) => {
        const count = Math.max(1, nodes.length);
        const t = count <= 1 ? 0 : index / (count - 1);
        const centred = t - 0.5;
        if (mode === "mood") return { x: centred * 0.22, y: Math.sin(t * Math.PI) * -0.10 };
        if (mode === "recommendations") return { x: centred * 0.34, y: Math.cos(t * Math.PI * 2) * 0.06 };
        if (mode === "watchlist") return { x: centred * 0.44, y: Math.sin(t * Math.PI * 2) * 0.16 };
        if (mode === "franchise") return { x: centred * 0.52, y: Math.sin(t * Math.PI) * 0.22 };
        if (mode === "artwork") return { x: centred * 0.62, y: Math.cos(t * Math.PI) * 0.26 };
        if (mode === "watch-order") return { x: centred * 0.76, y: Math.sin(t * Math.PI * 2) * 0.30 };
        return { x: centred, y: 0 };
      }));
    }
    // The canonical pool is already ranked. Read the current order on every
    // frame so an AI re-rank changes orbital proximity without restarting the
    // cinematic entrance or snapping the field back to lineup.
    const getRankWeight = (index: number) => {
      const currentMode = fieldModeRef.current;
      const t = index / rankDenominator;
      return 1 - t * (currentMode === "recommendations" || currentMode === "mood" ? 0.24 : 0.08);
    };
    const getModeTarget = (index: number, mode: NexusFieldMode) =>
      modeTargets.get(mode)?.[index] ?? { x: 0, y: 0 };
    const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));
    const ease = (t: number) => 1 - Math.pow(1 - t, 3);

    geometry.forEach(({ motion, orbit }) => {
      if (!motion || !orbit) return;
      motion.style.animation = "none";
      motion.style.opacity = "1";
      motion.style.transform = "none";
      orbit.style.animation = "none";
      orbit.style.transform = "translate3d(0,0,0) scale(1) rotateZ(0deg)";
    });

    const onDragMove = (event: PointerEvent) => {
      const pointerX = ((event.clientX - rect.left) / rect.width - 0.5) * 2;
      const pointerY = ((event.clientY - rect.top) / rect.height - 0.5) * 2;
      pointerRef.current = { x: pointerX, y: pointerY, active: true };
      pendingPointerX = pointerX;
      pendingPointerY = pointerY;
      if (!pointerStyleRaf) {
        pointerStyleRaf = window.requestAnimationFrame(() => {
          pointerStyleRaf = 0;
          field.style.setProperty("--world-pointer-x", pendingPointerX.toFixed(3));
          field.style.setProperty("--world-pointer-y", pendingPointerY.toFixed(3));
          field.style.setProperty("--world-x", (pendingPointerX * 3.5).toFixed(2) + "px");
          field.style.setProperty("--world-y", (pendingPointerY * 3.5).toFixed(2) + "px");
        });
      }
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

    const onVisibilityChange = () => {
      if (document.visibilityState === "visible" && !motionAbort && !raf) {
        previousNow = performance.now();
        raf = window.requestAnimationFrame(tick);
      }
    };
    document.addEventListener("visibilitychange", onVisibilityChange);

    // A responsive field cannot keep using the geometry captured before a
    // rotation/resize. Re-run the motion setup after the viewport settles so
    // the shared centre and radii are recalculated from the new field bounds.
    let resizeTimer = 0;
    const onResize = () => {
      window.clearTimeout(resizeTimer);
      resizeTimer = window.setTimeout(() => setFieldRevision((value) => value + 1), 140);
    };
    window.addEventListener("resize", onResize, { passive: true });

    const tick = (now: number) => {
      if (motionAbort || !inView) return;
      if (document.visibilityState === "hidden") {
        raf = 0;
        return;
      }
      const elapsed = now - started;
      const dt = Math.min(48, Math.max(8, now - previousNow));
      const nextPhase: typeof phase = elapsed < lineupDuration ? "lineup" : elapsed < lineupDuration + travelDuration ? "travel" : "orbit";
      if (nextPhase !== phase) {
        phase = nextPhase;
        field.dataset.phase = phase;
      }
      previousNow = now;

      if (dragRef.current.active) {
        orbitPhase = Number(field.dataset.orbitDrag || orbitPhase);
      } else if (Math.abs(angularVelocity) > 0.0008) {
        orbitPhase += angularVelocity * (dt / 1000);
        angularVelocity *= Math.pow(0.035, dt / 1000);
        field.dataset.orbitInertia = angularVelocity.toFixed(4);
      }

      const pulseMorph = aiPulsing
        ? Math.min(1, Math.max(0, (now - aiPulseStartedRef.current) / 720))
        : 1;
      const pointer = pointerRef.current;
      const pointerX = pointer.active ? pointer.x : 0;
      const pointerY = pointer.active ? pointer.y : 0;
      const lockTarget = Number(field.dataset.lockTarget ?? "-1");

      geometry.forEach(({ node, orbit, index, baseX, baseY, lineX, lineY, phase }) => {
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
          if (travelT >= 1 && !arrivalCuePlayed && index === nodes.length - 1 && !reduceMotion) {
            arrivalCuePlayed = true;
            playInteractionSound("discovery", { gain: 0.46 });
          }
          const p = ease(travelT);
          const angle = phase + orbitPhase;
          // The travel destination must be the exact first frame of the orbit,
          // including rank/mode shaping and pointer-safe radius. Otherwise the
          // final travel frame and orbit frame can differ by a few pixels and
          // read as a mechanical snap.
          const travelRankWeight = getRankWeight(index);
          const travelMode = fieldModeRef.current;
          const travelTarget = getModeTarget(index, travelMode);
          const travelModeX = 1 + travelTarget.x * (aiPulsing ? pulseMorph : 1);
          const travelModeY = 1 + travelTarget.y * (aiPulsing ? pulseMorph : 1);
          const travelRadiusX = radiusX * travelRankWeight * travelModeX * (1 - Math.abs(pointerX) * 0.035);
          const travelRadiusY = radiusY * travelRankWeight * travelModeY * (1 - Math.abs(pointerY) * 0.025);
          // Match the orbit phase's centre offset and viewport-safe clamp here,
          // not only its ellipse. Without this, the final travel frame can land
          // outside the safe bounds and jump when the orbit phase clamps it.
          const travelCentreX = centreX + pointerX * 18;
          const travelCentreY = centreY + pointerY * 12;
          const safeTargetX = clamp(
            travelCentreX + Math.cos(angle) * travelRadiusX,
            node.offsetWidth / 2 + 6,
            rect.width - node.offsetWidth / 2 - 6,
          );
          const safeTargetY = clamp(
            travelCentreY + Math.sin(angle) * travelRadiusY,
            node.offsetHeight / 2 + 12,
            rect.height - node.offsetHeight / 2 - 18,
          );
          const targetX = safeTargetX - baseX;
          const targetY = safeTargetY - baseY;
          const startX = lineX - baseX;
          const startY = lineY - baseY;
          const side = index % 2 === 0 ? -1 : 1;

          // Three unmistakable stages: lift from lineup -> collapse toward the
          // shared centre -> slingshot outward into the final orbit.
          const entryP = Math.min(1, p / 0.14);
          const entryEase = ease(entryP);
          const spiralP = Math.min(1, Math.max(0, (p - 0.10) / 0.66));
          const spiralEase = ease(spiralP);
          const outwardP = Math.min(1, Math.max(0, (p - 0.62) / 0.38));
          const outwardEase = ease(outwardP);
          const centreLocalX = centreX - baseX;
          const centreLocalY = centreY - baseY;
          const entryX = startX + (centreLocalX - startX) * entryEase;
          const entryY = startY + (centreLocalY - startY) * entryEase;
          const spiralRadius = 0.42 * (1 - spiralEase) + 0.58 * outwardEase;
          const spiralX = centreLocalX + Math.cos(angle + side * 0.72 * (1 - p)) * radiusX * spiralRadius;
          const spiralY = centreLocalY + Math.sin(angle + side * 0.72 * (1 - p)) * radiusY * spiralRadius;
          const arc = Math.sin(Math.PI * p) * travelArc * rect.height * (1 + index * 0.035);

          x = p < 0.14
            ? entryX
            : spiralX + (targetX - spiralX) * outwardEase;
          y = p < 0.14
            ? entryY - Math.sin(Math.PI * entryP) * travelLift
            : spiralY + (targetY - spiralY) * outwardEase + arc * side;

          // A full, visible 3D spin makes the journey readable even on a
          // relatively small mobile viewport.
          const spinTurns = 1.35 + index * 0.08;
          rotation = side * (125 * (1 - p)) + Math.sin(p * Math.PI * 2 * spinTurns) * 22 * (1 - p);
          rotateY = side * (170 * (1 - p)) + Math.sin(p * Math.PI) * side * 18;
          rotateX = Math.sin(p * Math.PI) * -14 * side;
          scale = 0.66 + 0.24 * p;

          if (travelT >= 1) {
            const orbitT = (local - lineupDuration - travelDuration) / orbitDuration;
            const a = phase + orbitT * Math.PI * 2 + orbitPhase;
            const rankWeight = getRankWeight(index);
            const mode = fieldModeRef.current;
            const modeTarget = getModeTarget(index, mode);
            const modeMorph = pulseMorph;
            const modeX = 1 + modeTarget.x * modeMorph;
            const modeY = 1 + modeTarget.y * modeMorph;
            const dynamicRadiusX = radiusX * rankWeight * modeX * (1 - Math.abs(pointerX) * 0.035);
            const dynamicRadiusY = radiusY * rankWeight * modeY * (1 - Math.abs(pointerY) * 0.025);
            const fieldCentreX = centreX + pointerX * 18;
            const fieldCentreY = centreY + pointerY * 12;
            const orbitalX = fieldCentreX + Math.cos(a) * dynamicRadiusX;
            const orbitalY = fieldCentreY + Math.sin(a) * dynamicRadiusY;
            x = orbitalX - baseX;
            y = orbitalY - baseY;

            // Travel resolves to the same mathematical target used by orbit.
            // Avoid blending through the field origin, which caused a visible
            // snap-to-centre between the travel and orbit phases.
            // The magnetic field is allowed to move freely, but the final card
            // centre is clamped against the actual viewport-safe bounds. This
            // keeps the orbital envelope stable on narrow screens too.
            const targetCenterX = centreX + x;
            const targetCenterY = centreY + y;
            const safeX = clamp(targetCenterX, node.offsetWidth / 2 + 6, rect.width - node.offsetWidth / 2 - 6);
            const safeY = clamp(targetCenterY, node.offsetHeight / 2 + 12, rect.height - node.offsetHeight / 2 - 18);
            x = safeX - baseX;
            y = safeY - baseY;

            if (lockTarget === index) {
              const lockPulse = 0.5 + 0.5 * Math.sin(now * 0.005);
              x += pointerX * 5 * lockPulse;
              y += pointerY * 4 * lockPulse;
              scale += 0.045 + lockPulse * 0.025;
              rotateY += pointerX * 3;
              rotateX -= pointerY * 2;
            }

            const depth = (Math.sin(a) + 1) / 2;
            scale = Math.min(1.18, 0.90 + depth * 0.12 + attraction / (mobile ? 700 : 900) + (1 - rankWeight) * -0.035);
            node.style.setProperty("--rank-weight", rankWeight.toFixed(3));
            rotation = Math.cos(a) * 2.2;
            rotateY += Math.sin(a) * 7 + pointerX * 2.5;
            rotateX += -Math.cos(a) * 4 + pointerY * -2.2;
            node.style.setProperty("--orbit-depth", depth.toFixed(3));
            node.style.setProperty("--orbit-angle", a.toFixed(3));
            node.style.setProperty("--orbit-attraction", attraction.toFixed(2));
            node.style.setProperty("--orbit-repulsion", repulsion.toFixed(2));
          }
        }

        motionPositions[index] = { x, y };
        node.style.setProperty("--node-motion-x", `${x.toFixed(2)}px`);
        node.style.setProperty("--node-motion-y", `${y.toFixed(2)}px`);
        const zDepth = ((scale - 0.66) / 0.52 - 0.5) * 42;
        orbit.style.transform =
          `perspective(900px) translateZ(${zDepth.toFixed(2)}px) rotateX(${rotateX.toFixed(2)}deg) rotateY(${rotateY.toFixed(2)}deg) scale(${scale.toFixed(3)}) rotateZ(${rotation.toFixed(2)}deg)`;

        if (local >= lineupDuration + travelDuration) {
          const a = phase + ((local - lineupDuration - travelDuration) / orbitDuration) * Math.PI * 2 + orbitPhase;
          node.style.zIndex = String(20 + Math.round(((Math.sin(a) + 1) / 2) * 20));
        } else {
          node.style.zIndex = String(30 + index);
        }
      });

      // Keep the connective graph physically attached to the cards.
      connectionLines.forEach((line, index) => {
        const g = geometry[index];
        if (!g) return;
        const position = motionPositions[index];
        if (!position) return;
        const x = ((g.baseX + position.x) / rect.width) * 100;
        const y = ((g.baseY + position.y) / rect.height) * 100;
        line.setAttribute('x2', x.toFixed(2));
        line.setAttribute('y2', y.toFixed(2));
        line.setAttribute('x1', '50');
        line.setAttribute('y1', '50');
      });

      raf = window.requestAnimationFrame(tick);
    };

    if (reduceMotion) {
      geometry.forEach(({ node, baseX, baseY, phase, orbit }) => {
        if (!node || !orbit) return;
        node.style.setProperty("--node-motion-x", `${(centreX + Math.cos(phase) * radiusX - baseX).toFixed(2)}px`);
        node.style.setProperty("--node-motion-y", `${(centreY + Math.sin(phase) * radiusY - baseY).toFixed(2)}px`);
        orbit.style.transform = "translate3d(0,0,0) scale(1)";
      });
    } else {
      raf = window.requestAnimationFrame(tick);
    }

    return () => {
      motionAbort = true;
      window.cancelAnimationFrame(raf);
      if (pointerStyleRaf) window.cancelAnimationFrame(pointerStyleRaf);
      field.removeEventListener("pointermove", onDragMove);
      field.removeEventListener("pointerleave", onPointerLeave);
      field.removeEventListener("pointerdown", onDragStart);
      field.removeEventListener("pointerup", onDragEnd);
      field.removeEventListener("pointercancel", onDragEnd);
      document.removeEventListener("visibilitychange", onVisibilityChange);
      window.removeEventListener("resize", onResize);
      window.clearTimeout(resizeTimer);
    };
  }, [entered, inView, worlds.length, fieldRevision]);

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
  const visibleCommand = commandLabel ?? "Explore the Discovery Field";
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
      className={"nexus-world-map nexus-world-map--" + fieldMode + (entered ? " is-entered" : "") + (active !== null ? " has-active" : "") + (secret ? " has-secret" : "") + (commandLabel ? " is-ai-directed" : "") + (travelling !== null ? " is-travelling" : "") + (aiPulsing ? " is-ai-pulsing" : "")}
      data-ai-pulse={aiPulse}
    >
      <div className="nexus-world-grid" aria-hidden />
      <div className="nexus-world-orbit-plane" aria-hidden>
        <i className="nexus-world-orbit-plane__ring nexus-world-orbit-plane__ring--outer" />
        <i className="nexus-world-orbit-plane__ring nexus-world-orbit-plane__ring--inner" />
        <i className="nexus-world-orbit-plane__axis nexus-world-orbit-plane__axis--x" />
        <i className="nexus-world-orbit-plane__axis nexus-world-orbit-plane__axis--y" />
      </div>
      <div className="nexus-world-trajectory" aria-hidden><i /><i /><i /><i /><i /><i /></div>
      <div className="nexus-world-arrival-flare" aria-hidden />
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
            href={"/anime/" + anime.id}
            key={anime.id}
            className={"nexus-world-node nexus-world-node--" + (index + 1) + (isActive ? " is-active" : "") + (isArmed ? " is-armed" : "") + (travelling === index ? " is-travelling-origin" : "") + (fieldMode !== "discovery" ? " is-ai-reweighted" : "")}
            style={{
              "--node-x": position.x,
              "--node-y": position.y,
              "--node-index": index,
            } as CSSProperties}
            onMouseEnter={() => { setActive(index); setArmed(index); fieldRef.current?.setAttribute("data-lock-target", String(index)); }}
            onFocus={() => { setActive(index); setArmed(index); fieldRef.current?.setAttribute("data-lock-target", String(index)); }}
            onBlur={() => { setArmed(null); fieldRef.current?.setAttribute("data-lock-target", "-1"); }}
            onClick={(event) => {
              if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0) return;
              if (armed !== index) {
                setArmed(index);
                setActive(index);
                return;
              }
              setTravelling(index);
              fieldRef.current?.setAttribute("data-motion-lock", String(index));
              window.setTimeout(() => {
                setTravelling(null);
                fieldRef.current?.removeAttribute("data-motion-lock");
              }, 1100);
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
              <span
                className="nexus-world-node-art"
                style={{ viewTransitionName: getAnimeViewTransitionName(anime.id) } as CSSProperties}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={anime.image} alt="" loading="lazy" decoding="async" fetchPriority="low" />
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
