"use client";

/**
 * Live page-terrain actor — locomotion + phase machine.
 * Sprint 1: mesh extracted to CharacterRenderer (no AI in renderer).
 */

import { useFrame, useThree } from "@react-three/fiber";
import {
  useEffect,
  useRef,
  type MutableRefObject,
} from "react";
import * as THREE from "three";
import {
  getHomePlatform,
  pickWanderPlatform,
  planHops,
  type TerrainPlatform,
} from "@/lib/mascot/page-terrain";
import {
  createTerrainBody,
  jumpToward,
  snapToPlatform,
  stepTerrain,
  steerTerrain,
  freeHop,
  clampToViewport,
  viewportBounds,
  type TerrainBody,
} from "@/lib/mascot/terrain-physics";
import { useMascotStore } from "@/lib/mascot/store";
import { motionFromEmotions } from "@/lib/mascot/emotions";
import {
  worldMood,
  lingerMs,
  homeRestMs,
  outingIntervalMs,
} from "@/lib/mascot/living-world";
import {
  poseOnPlatform,
  theatreForPlatform,
  type TheatreBeat,
} from "@/lib/mascot/ui-theatre";
import {
  expressionFromAnim,
  expressionFromEmotions,
} from "@/lib/mascot/expression";
import { CharacterRenderer } from "./CharacterRenderer";

export type Phase = "home" | "outing" | "returning" | "perform";
export type MascotScreenPos = { x: number; y: number; visible: boolean };

function homeWorld(): { x: number; y: number } {
  if (typeof window === "undefined") return { x: 1.05, y: -0.72 };
  const aspect = window.innerWidth / (window.innerHeight || 1);
  return { x: Math.min(aspect * 0.78, 1.32), y: -0.72 };
}

function isBreakoutTheatre(b: TheatreBeat | undefined): boolean {
  if (!b) return false;
  if (
    b.move === "climb-modal" ||
    b.move === "inside-poster" ||
    b.move === "inspect"
  )
    return true;
  const intent = b.intent;
  return (
    intent === "curious" ||
    intent === "celebrate" ||
    intent === "point" ||
    intent === "shy_wave"
  );
}

export function Actor({
  platforms,
  dragging,
  dragWorld,
  onScreenPos,
  bodyRef,
  phaseRef,
  lowPower,
}: {
  platforms: TerrainPlatform[];
  dragging: boolean;
  dragWorld: { x: number; y: number } | null;
  onScreenPos: (p: MascotScreenPos) => void;
  bodyRef: MutableRefObject<TerrainBody | null>;
  phaseRef: MutableRefObject<Phase>;
  lowPower: boolean;
}) {
  const root = useRef<THREE.Group>(null);
  const queue = useRef<TerrainPlatform[]>([]);
  const mood = useRef(worldMood());
  const homeUntil = useRef(0);
  const performUntil = useRef(0);
  const nextFreeHop = useRef(0);
  const nextRoam = useRef(0);
  const nextOuting = useRef(Date.now() + 20_000 + Math.random() * 12_000);
  const beat = useRef<TheatreBeat | null>(null);
  const facing = useRef(0);
  const seeded = useRef(false);
  const padWander = useRef(0);
  const speedRef = useRef(0);
  const justLandedRef = useRef(false);
  const wasAirborne = useRef(false);

  const emotions = useMascotStore((s) => s.emotions);
  const setAnim = useMascotStore((s) => s.setAnim);
  const anim = useMascotStore((s) => s.anim);
  const layers = useMascotStore((s) => s.layers);
  const { camera, size } = useThree();

  useEffect(() => {
    const h = homeWorld();
    if (!bodyRef.current) {
      bodyRef.current = createTerrainBody(h.x, h.y);
      bodyRef.current.onGround = true;
      bodyRef.current.platformId = "home-corner";
    }
    const home = getHomePlatform(platforms);
    if (home) {
      if (phaseRef.current === "home" || !seeded.current) {
        bodyRef.current = snapToPlatform(bodyRef.current, home);
        bodyRef.current.platformId = "home-corner";
        seeded.current = true;
      }
    }
  }, [platforms, bodyRef, phaseRef]);

  useEffect(() => {
    const id = window.setInterval(() => {
      mood.current = worldMood();
    }, 60_000);
    mood.current = worldMood();
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    const onTheatre = (e: Event) => {
      const b = (e as CustomEvent).detail as TheatreBeat;
      const now = Date.now();
      if (phaseRef.current === "home" && now < homeUntil.current) return;
      if (phaseRef.current === "home" && !isBreakoutTheatre(b)) return;

      beat.current = b;
      const openModal = platforms.find((p) => p.type === "modal");
      const dest =
        openModal ||
        pickWanderPlatform(platforms, bodyRef.current?.platformId ?? undefined);
      if (dest && bodyRef.current) {
        phaseRef.current = "outing";
        queue.current = planHops(
          platforms.find((x) => x.id === bodyRef.current!.platformId) ?? null,
          dest,
          platforms,
        );
        const first = queue.current[0];
        if (first) {
          bodyRef.current = jumpToward(bodyRef.current, first, true);
          setAnim("jump");
        }
      }
    };
    window.addEventListener("animenexus:mascot-theatre", onTheatre);
    return () =>
      window.removeEventListener("animenexus:mascot-theatre", onTheatre);
  }, [platforms, setAnim, bodyRef, phaseRef]);

  useFrame((state, delta) => {
    const dt = Math.min(delta, 0.05);
    const motion = motionFromEmotions(emotions);
    const g = root.current;
    justLandedRef.current = false;

    if (!bodyRef.current) {
      const h = homeWorld();
      bodyRef.current = createTerrainBody(h.x, h.y);
      bodyRef.current.onGround = true;
      bodyRef.current.platformId = "home-corner";
    }
    if (!g) return;

    let body = bodyRef.current;
    const home = getHomePlatform(platforms) ?? null;
    const now = Date.now();
    const m = mood.current;
    const phase = phaseRef.current;
    const freed =
      phase === "outing" || phase === "returning" || phase === "perform";

    if (dragging && dragWorld) {
      body.x = dragWorld.x;
      body.y = dragWorld.y;
      body.vx = 0;
      body.vy = 0;
      body.onGround = false;
      body.platformId = null;
      body = clampToViewport(body);
      bodyRef.current = body;
      queue.current = [];
      phaseRef.current = "outing";
      setAnim("surprised");
      nextFreeHop.current = now + 500;
      nextRoam.current = now + 1000;
    } else if (phase === "home") {
      if (home) {
        padWander.current += dt;
        if (padWander.current > 3 + Math.random() * 2.5) {
          padWander.current = 0;
          const ox = (Math.random() - 0.5) * home.hw * 1.1;
          const oy = (Math.random() - 0.5) * home.hh * 0.7;
          body.x = home.x + ox;
          body.y = home.y + home.hh + oy;
        }
        const maxDx = home.hw * 0.95;
        const maxDy = home.hh * 0.9;
        body.x = THREE.MathUtils.clamp(body.x, home.x - maxDx, home.x + maxDx);
        body.y = THREE.MathUtils.clamp(
          body.y,
          home.y + home.hh - maxDy,
          home.y + home.hh + maxDy,
        );
        body.vx = 0;
        body.vy = 0;
        body.onGround = true;
        body.platformId = "home-corner";
        queue.current = [];
        bodyRef.current = body;
      }

      if (m.preferNap && anim !== "sleep" && Math.random() < 0.001) {
        setAnim("sleep");
      } else if (
        anim !== "sleep" &&
        anim !== "idle" &&
        layers.social === "none"
      ) {
        setAnim("idle");
      }

      if (
        now > nextOuting.current &&
        now > homeUntil.current &&
        body.onGround &&
        !m.preferNap
      ) {
        const dest = pickWanderPlatform(platforms, "home-corner", false);
        if (dest && dest.id !== "home-corner") {
          phaseRef.current = "outing";
          beat.current = theatreForPlatform(dest);
          queue.current = planHops(home, dest, platforms);
          const first = queue.current[0];
          if (first && bodyRef.current) {
            bodyRef.current = jumpToward(bodyRef.current, first, true);
            setAnim("jump");
          }
          nextRoam.current = now + 2800 + Math.random() * 2000;
          nextFreeHop.current = now + 800;
        }
        nextOuting.current = now + outingIntervalMs(m, lowPower);
      }
    } else {
      if (phase === "perform" && now >= performUntil.current) {
        phaseRef.current = "outing";
        beat.current = null;
        homeUntil.current = now + 600;
        nextRoam.current = now + 500;
      }

      if (
        body.onGround &&
        queue.current.length === 0 &&
        now > nextFreeHop.current &&
        phaseRef.current === "outing"
      ) {
        if (Math.random() < 0.4) {
          bodyRef.current = freeHop(bodyRef.current);
          setAnim("jump");
          nextFreeHop.current = now + 900 + Math.random() * 1600;
        } else {
          nextFreeHop.current = now + 500 + Math.random() * 900;
        }
      }

      if (
        body.onGround &&
        queue.current.length === 0 &&
        phaseRef.current === "outing" &&
        now > nextRoam.current &&
        now > homeUntil.current
      ) {
        const dest = pickWanderPlatform(
          platforms,
          body.platformId ?? undefined,
          false,
        );
        if (dest && dest.id !== "home-corner") {
          beat.current = theatreForPlatform(dest);
          const current =
            platforms.find((x) => x.id === body.platformId) ?? null;
          queue.current = planHops(current, dest, platforms);
          const first = queue.current[0];
          if (first) {
            bodyRef.current = jumpToward(bodyRef.current, first, true);
            setAnim("jump");
          }
          nextRoam.current = now + 2800 + Math.random() * 3200;
        } else {
          if (home) {
            phaseRef.current = "returning";
            queue.current = planHops(
              platforms.find((x) => x.id === body.platformId) ?? null,
              home,
              platforms,
            );
            const first = queue.current[0];
            if (first && bodyRef.current) {
              bodyRef.current = jumpToward(bodyRef.current, first, true);
              setAnim("jump");
            }
          }
          nextRoam.current = now + 1200;
        }
      }

      if (
        (phaseRef.current === "outing" || phaseRef.current === "perform") &&
        queue.current.length === 0 &&
        body.onGround &&
        home
      ) {
        if (body.platformId !== "home-corner") {
          if (beat.current && phaseRef.current === "outing") {
            const tb = beat.current;
            const at = platforms.find((x) => x.id === body.platformId);
            if (at) {
              const pos = poseOnPlatform(at, tb.pose);
              body.x = pos.x;
              body.y = pos.y;
              body.vx = 0;
              body.vy = 0;
              body.onGround = true;
              bodyRef.current = clampToViewport(body);
            }
            setAnim(tb.anim);
            if (tb.thought) {
              window.dispatchEvent(
                new CustomEvent("animenexus:mascot-thought", {
                  detail: { text: tb.thought, intent: tb.intent },
                }),
              );
            }
            phaseRef.current = "perform";
            performUntil.current = now + tb.holdMs;
          } else if (homeUntil.current === 0) {
            homeUntil.current = now + lingerMs(m) * 1.4 + 1800;
          } else if (now > homeUntil.current) {
            phaseRef.current = "returning";
            beat.current = null;
            const current =
              platforms.find((x) => x.id === body.platformId) ?? null;
            queue.current = planHops(current, home, platforms);
            const first = queue.current[0];
            if (first && bodyRef.current) {
              bodyRef.current = jumpToward(bodyRef.current, first, true);
              setAnim("jump");
            }
            homeUntil.current = 0;
          }
        } else {
          phaseRef.current = "home";
          setAnim("idle");
          homeUntil.current = now + homeRestMs(m);
          nextOuting.current = now + outingIntervalMs(m, lowPower);
        }
      }

      if (
        phaseRef.current === "returning" &&
        queue.current.length === 0 &&
        (body.platformId === "home-corner" || !body.platformId)
      ) {
        phaseRef.current = "home";
        if (home) bodyRef.current = snapToPlatform(bodyRef.current, home);
        setAnim(m.preferNap ? "sleep" : "idle");
        homeUntil.current = now + homeRestMs(m);
        nextOuting.current = now + outingIntervalMs(m, lowPower);
        beat.current = null;
      }

      const goal = queue.current[0];
      if (goal) {
        const goalY = goal.y + goal.hh;
        if (body.onGround) {
          bodyRef.current = steerTerrain(
            bodyRef.current,
            goal.x,
            goalY,
            Math.max(0.7, motion.walkSpeed * 1.8),
            true,
          );
          if (anim !== "walk" && anim !== "jump") setAnim("walk");
        }
        if (
          Math.abs(bodyRef.current.x - goal.x) <
            Math.max(0.1, goal.hw * 0.8) &&
          Math.abs(bodyRef.current.y - goalY) < 0.25
        ) {
          bodyRef.current = snapToPlatform(bodyRef.current, goal);
          queue.current.shift();
          if (queue.current.length > 0) {
            const nxt = queue.current[0];
            bodyRef.current = jumpToward(bodyRef.current, nxt, true);
            setAnim("jump");
          } else if (!(beat.current && phaseRef.current === "outing")) {
            setAnim("happy");
            if (phaseRef.current === "outing") {
              homeUntil.current = Date.now() + lingerMs(m) * 1.4;
              nextFreeHop.current = Date.now() + 600;
            }
          }
        }
      }

      if (phaseRef.current !== "home" && phaseRef.current !== "perform") {
        bodyRef.current = stepTerrain(bodyRef.current, platforms, dt, true);
      }

      bodyRef.current = clampToViewport(bodyRef.current);
    }

    bodyRef.current = clampToViewport(bodyRef.current);
    const bSafe = bodyRef.current;
    const vb = viewportBounds(0.1);
    if (
      !dragging &&
      (bSafe.x < vb.minX - 0.05 ||
        bSafe.x > vb.maxX + 0.05 ||
        bSafe.y < vb.minY - 0.05 ||
        bSafe.y > vb.maxY + 0.05)
    ) {
      if (home) {
        bodyRef.current = snapToPlatform(bSafe, home);
        phaseRef.current = "home";
        queue.current = [];
        homeUntil.current = now + homeRestMs(m);
        nextOuting.current = now + outingIntervalMs(m, lowPower);
        setAnim("idle");
      } else {
        bodyRef.current = clampToViewport(bSafe, 0.15);
      }
    }

    const b = bodyRef.current;
    if (wasAirborne.current && b.onGround) {
      justLandedRef.current = true;
      if (anim === "jump") setAnim("land");
    }
    wasAirborne.current = !b.onGround;

    speedRef.current = Math.hypot(b.vx, b.vy ?? 0);

    let targetYaw = 0;
    if (Math.abs(b.vx) > 0.04) targetYaw = b.vx > 0 ? -0.38 : 0.38;
    if (dragging || phaseRef.current === "home") targetYaw = 0;
    facing.current = THREE.MathUtils.lerp(
      facing.current,
      targetYaw,
      freed ? 0.2 : 0.14,
    );
    g.rotation.y = facing.current;
    g.rotation.z = THREE.MathUtils.lerp(
      g.rotation.z,
      freed ? THREE.MathUtils.clamp(-b.vx * 0.04, -0.12, 0.12) : 0,
      0.12,
    );

    const bob = Math.sin(state.clock.elapsedTime * 2.2) * 0.012 * (freed ? 1 : 0.5);
    g.position.set(b.x, b.y + 0.06 + bob, 0.35);

    const world = new THREE.Vector3(b.x, b.y + 0.1, 0.35);
    world.project(camera);
    let sx = (world.x * 0.5 + 0.5) * size.width;
    let sy = (-world.y * 0.5 + 0.5) * size.height;
    const pad = 40;
    sx = Math.max(pad, Math.min(size.width - pad, sx));
    sy = Math.max(pad, Math.min(size.height - pad, sy));
    onScreenPos({ x: sx, y: sy, visible: true });
  });

  const expression = expressionFromAnim(
    anim,
    expressionFromEmotions(emotions),
  );

  return (
    <group ref={root}>
      <CharacterRenderer
        expression={expression}
        anim={anim}
        yaw={facing.current}
        speed={speedRef.current}
        justLanded={anim === "land" || justLandedRef.current}
        scale={0.55}
      />
    </group>
  );
}
