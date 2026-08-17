"use client";

/**
 * Live page-terrain actor — physics + command execution only.
 *
 * Sprint 1: CharacterRenderer
 * Sprint 3: MovementCommand / store.target
 * Sprint 4: NO independent outing / roam / free-hop AI
 *
 * Actor may:
 *  - execute MovementCommand + store.target hop queues
 *  - run terrain physics, clamp, drag
 *  - micro-fidget inside home pad
 *  - return home after a command finishes (completion, not destination inventing)
 *
 * Actor may NOT:
 *  - schedule nextOuting / nextRoam / freeHop destinations
 *  - pickWanderPlatform for its own amusement
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
  nearestPlatform,
  planHops,
  type TerrainPlatform,
} from "@/lib/mascot/page-terrain";
import {
  createTerrainBody,
  jumpToward,
  snapToPlatform,
  stepTerrain,
  steerTerrain,
  clampToViewport,
  viewportBounds,
  type TerrainBody,
} from "@/lib/mascot/terrain-physics";
import { useMascotStore } from "@/lib/mascot/store";
import { motionFromEmotions } from "@/lib/mascot/emotions";
import { worldMood, homeRestMs } from "@/lib/mascot/living-world";
import {
  expressionFromAnim,
  expressionFromEmotions,
} from "@/lib/mascot/expression";
import {
  clearMovementCommand,
  issueFromStoreTarget,
  issueReturnHome,
  peekMovementCommand,
  type MovementCommand,
} from "@/lib/mascot/movement-command";
import { CharacterRenderer } from "./CharacterRenderer";

export type Phase = "home" | "outing" | "returning" | "perform";
export type MascotScreenPos = { x: number; y: number; visible: boolean };

function homeWorld(): { x: number; y: number } {
  if (typeof window === "undefined") return { x: 1.05, y: -0.72 };
  const aspect = window.innerWidth / (window.innerHeight || 1);
  return { x: Math.min(aspect * 0.78, 1.32), y: -0.72 };
}

function resolveCommandDest(
  platforms: TerrainPlatform[],
  cmd: MovementCommand,
): TerrainPlatform | null {
  if (cmd.platformId) {
    const byId = platforms.find((p) => p.id === cmd.platformId);
    if (byId) return byId;
  }
  if (cmd.mode === "return-home") {
    return getHomePlatform(platforms);
  }
  return nearestPlatform(platforms, cmd.target.x, cmd.target.y);
}

function storeKey(t: { x: number; y: number }) {
  return `store-${t.x.toFixed(2)}-${t.y.toFixed(2)}`;
}

export function Actor({
  platforms,
  dragging,
  dragWorld,
  onScreenPos,
  bodyRef,
  phaseRef,
  lowPower: _lowPower,
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
  const facing = useRef(0);
  const seeded = useRef(false);
  const padWander = useRef(0);
  const speedRef = useRef(0);
  const justLandedRef = useRef(false);
  const wasAirborne = useRef(false);
  const activeCmdId = useRef<string | null>(null);
  const cmdSpeed = useRef(1);
  const returnAfterCmd = useRef(false);

  const emotions = useMascotStore((s) => s.emotions);
  const setAnim = useMascotStore((s) => s.setAnim);
  const anim = useMascotStore((s) => s.anim);
  const layers = useMascotStore((s) => s.layers);
  const storeTarget = useMascotStore((s) => s.target);
  const setStorePosition = useMascotStore((s) => s.setPosition);
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

  // External theatre events → MovementCommand (not Actor inventing destinations)
  useEffect(() => {
    const onTheatre = (e: Event) => {
      const detail = (e as CustomEvent).detail as {
        clientX?: number;
        clientY?: number;
        platformId?: string;
        x?: number;
        y?: number;
      } | null;
      if (!detail) return;
      if (typeof detail.x === "number" && typeof detail.y === "number") {
        issueFromStoreTarget(
          { x: detail.x, y: detail.y },
          "theatre-event",
          detail.platformId,
        );
        useMascotStore.getState().setTarget({ x: detail.x, y: detail.y });
        return;
      }
      if (detail.platformId) {
        const p = platforms.find((x) => x.id === detail.platformId);
        if (p) {
          issueFromStoreTarget(
            { x: p.x, y: p.y + p.hh },
            "theatre-platform",
            p.id,
          );
          useMascotStore.getState().setTarget({ x: p.x, y: p.y + p.hh });
        }
      }
    };
    window.addEventListener("animenexus:mascot-theatre", onTheatre);
    return () =>
      window.removeEventListener("animenexus:mascot-theatre", onTheatre);
  }, [platforms]);

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

    // ── Brain commands ────────────────────────────────────────────────
    const cmd = peekMovementCommand();
    if (!dragging && cmd && cmd.id !== activeCmdId.current) {
      const dest = resolveCommandDest(platforms, cmd);
      if (dest && bodyRef.current) {
        activeCmdId.current = cmd.id;
        cmdSpeed.current = cmd.speed;
        returnAfterCmd.current = cmd.mode !== "return-home";
        phaseRef.current =
          cmd.mode === "return-home" ? "returning" : "outing";
        const current =
          platforms.find((x) => x.id === bodyRef.current!.platformId) ?? null;
        queue.current = planHops(current, dest, platforms);
        const first = queue.current[0];
        if (first) {
          bodyRef.current = jumpToward(bodyRef.current, first, true);
          setAnim(cmd.mode === "jump" ? "jump" : "walk");
        }
        homeUntil.current = 0;
      }
    } else if (
      !dragging &&
      !cmd &&
      storeTarget &&
      activeCmdId.current !== storeKey(storeTarget)
    ) {
      const dest = nearestPlatform(platforms, storeTarget.x, storeTarget.y);
      if (dest && bodyRef.current) {
        activeCmdId.current = storeKey(storeTarget);
        cmdSpeed.current = 1;
        returnAfterCmd.current = dest.id !== "home-corner";
        phaseRef.current = dest.id === "home-corner" ? "returning" : "outing";
        const current =
          platforms.find((x) => x.id === bodyRef.current!.platformId) ?? null;
        queue.current = planHops(current, dest, platforms);
        const first = queue.current[0];
        if (first) {
          bodyRef.current = jumpToward(bodyRef.current, first, true);
          setAnim("walk");
        }
      }
    }

    // Arrive at command dest
    if (
      activeCmdId.current &&
      queue.current.length === 0 &&
      body.onGround &&
      (cmd || storeTarget)
    ) {
      const target = cmd?.target ?? storeTarget!;
      const d = Math.hypot(body.x - target.x, body.y - target.y);
      const atPlatform =
        !!cmd?.platformId && body.platformId === cmd.platformId;
      if (d < 0.4 || atPlatform || body.platformId === "home-corner") {
        if (cmd) clearMovementCommand(cmd.id);
        activeCmdId.current = null;
        useMascotStore.getState().setTarget(null);

        if (body.platformId === "home-corner" || phaseRef.current === "returning") {
          phaseRef.current = "home";
          if (home) bodyRef.current = snapToPlatform(bodyRef.current, home);
          setAnim(m.preferNap ? "sleep" : "idle");
          homeUntil.current = now + homeRestMs(m);
          returnAfterCmd.current = false;
        } else if (returnAfterCmd.current && home) {
          // Completion path: go home after brain-directed outing (not ambient roam)
          returnAfterCmd.current = false;
          issueReturnHome(
            { x: home.x, y: home.y + home.hh },
            "actor:post-command-home",
          );
          useMascotStore.getState().setTarget({
            x: home.x,
            y: home.y + home.hh,
          });
        } else {
          setAnim("happy");
          homeUntil.current = now + 2500;
        }
      }
    }

    const brainDriving =
      !!peekMovementCommand() || !!activeCmdId.current || !!storeTarget;

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
      activeCmdId.current = null;
      returnAfterCmd.current = false;
      clearMovementCommand();
      setAnim("surprised");
    } else if (phase === "home" && !brainDriving) {
      // Home pad only — micro fidget, no self-initiated outing
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
    } else {
      // Outing / returning — execute hop queue only
      if (
        phaseRef.current === "returning" &&
        queue.current.length === 0 &&
        (body.platformId === "home-corner" || !body.platformId) &&
        !brainDriving
      ) {
        phaseRef.current = "home";
        if (home) bodyRef.current = snapToPlatform(bodyRef.current, home);
        setAnim(m.preferNap ? "sleep" : "idle");
        homeUntil.current = now + homeRestMs(m);
        activeCmdId.current = null;
        clearMovementCommand();
      }

      const goal = queue.current[0];
      if (goal) {
        const goalY = goal.y + goal.hh;
        const spd =
          Math.max(0.7, motion.walkSpeed * 1.8) * (cmdSpeed.current || 1);
        if (body.onGround) {
          bodyRef.current = steerTerrain(
            bodyRef.current,
            goal.x,
            goalY,
            spd,
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
          } else if (anim !== "happy") {
            setAnim("happy");
          }
        }
      } else if (
        !brainDriving &&
        body.onGround &&
        phaseRef.current === "outing" &&
        home &&
        body.platformId !== "home-corner" &&
        now > homeUntil.current
      ) {
        // Stuck outing with no brain command → return home
        phaseRef.current = "returning";
        issueReturnHome(
          { x: home.x, y: home.y + home.hh },
          "actor:stuck-return",
        );
        useMascotStore.getState().setTarget({
          x: home.x,
          y: home.y + home.hh,
        });
      }

      if (phaseRef.current !== "home") {
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
        activeCmdId.current = null;
        clearMovementCommand();
        homeUntil.current = now + homeRestMs(m);
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

    if (Math.floor(state.clock.elapsedTime * 4) % 2 === 0) {
      setStorePosition({ x: b.x, y: b.y });
    }

    let targetYaw = 0;
    if (Math.abs(b.vx) > 0.04) targetYaw = b.vx > 0 ? -0.38 : 0.38;
    if (dragging || phaseRef.current === "home") targetYaw = 0;
    facing.current = THREE.MathUtils.lerp(
      facing.current,
      targetYaw,
      freed || brainDriving ? 0.2 : 0.14,
    );
    g.rotation.y = facing.current;
    g.rotation.z = THREE.MathUtils.lerp(
      g.rotation.z,
      freed ? THREE.MathUtils.clamp(-b.vx * 0.04, -0.12, 0.12) : 0,
      0.12,
    );

    const bob =
      Math.sin(state.clock.elapsedTime * 2.2) *
      0.012 *
      (freed || brainDriving ? 1 : 0.5);
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
