"use client";

/**
 * Full-viewport 3D companion (R3F) — orthographic overlay.
 * Small figure · mostly confined to home pad · breakouts onto UI / posters / modals.
 */

import { Canvas, useFrame, useThree } from "@react-three/fiber";
import {
  useEffect,
  useRef,
  useState,
  useCallback,
  type MutableRefObject,
} from "react";
import * as THREE from "three";
import {
  buildTerrain,
  getHomePlatform,
  pickWanderPlatform,
  planHops,
  screenToWorld,
  type TerrainPlatform,
} from "@/lib/mascot/page-terrain";
import {
  createTerrainBody,
  jumpToward,
  snapToPlatform,
  stepTerrain,
  steerTerrain,
  type TerrainBody,
} from "@/lib/mascot/terrain-physics";
import { useMascotStore } from "@/lib/mascot/store";
import { motionFromEmotions } from "@/lib/mascot/emotions";
import {
  worldMood,
  outingIntervalMs,
  lingerMs,
  homeRestMs,
} from "@/lib/mascot/living-world";
import { sampleProcedural } from "@/lib/mascot/procedural-motion";
import {
  poseOnPlatform,
  theatreForPlatform,
  type TheatreBeat,
} from "@/lib/mascot/ui-theatre";

type Phase = "home" | "outing" | "returning" | "perform";

export type MascotScreenPos = { x: number; y: number; visible: boolean };

function homeWorld(): { x: number; y: number } {
  if (typeof window === "undefined") return { x: 1.05, y: -0.72 };
  const aspect = window.innerWidth / (window.innerHeight || 1);
  return { x: Math.min(aspect * 0.78, 1.32), y: -0.72 };
}

function OrthoCamera() {
  const { camera, size } = useThree();
  useEffect(() => {
    const cam = camera as THREE.OrthographicCamera;
    const aspect = size.width / Math.max(size.height, 1);
    cam.left = -aspect;
    cam.right = aspect;
    cam.top = 1;
    cam.bottom = -1;
    cam.near = 0.1;
    cam.far = 20;
    cam.position.set(0, 0, 5);
    cam.lookAt(0, 0, 0);
    cam.updateProjectionMatrix();
  }, [camera, size]);
  return null;
}

function Actor({
  platforms,
  lowPower,
  dragging,
  dragWorld,
  onScreenPos,
  bodyRef,
}: {
  platforms: TerrainPlatform[];
  lowPower: boolean;
  dragging: boolean;
  dragWorld: { x: number; y: number } | null;
  onScreenPos: (p: MascotScreenPos) => void;
  bodyRef: MutableRefObject<TerrainBody | null>;
}) {
  const root = useRef<THREE.Group>(null);
  const pose = useRef<THREE.Group>(null);
  const head = useRef<THREE.Group>(null);
  const tip = useRef<THREE.Mesh>(null);
  const eyeL = useRef<THREE.Mesh>(null);
  const eyeR = useRef<THREE.Mesh>(null);
  const queue = useRef<TerrainPlatform[]>([]);
  const phase = useRef<Phase>("home");
  const mood = useRef(worldMood());
  const nextOuting = useRef(
    Date.now() + outingIntervalMs(mood.current, lowPower),
  );
  const homeUntil = useRef(0);
  const performUntil = useRef(0);
  const beat = useRef<TheatreBeat | null>(null);
  const facing = useRef(0);
  const seeded = useRef(false);
  const padWander = useRef(0); // tiny motion inside home pad
  const emotions = useMascotStore((s) => s.emotions);
  const setAnim = useMascotStore((s) => s.setAnim);
  const anim = useMascotStore((s) => s.anim);
  const lookBias = useMascotStore((s) => s.lookBias);
  const { camera, size } = useThree();

  useEffect(() => {
    const h = homeWorld();
    if (!bodyRef.current) {
      bodyRef.current = createTerrainBody(h.x, h.y);
      bodyRef.current.onGround = true;
      bodyRef.current.platformId = "home-corner";
    }
    const home = getHomePlatform(platforms);
    if (home && !seeded.current) {
      bodyRef.current = snapToPlatform(bodyRef.current, home);
      seeded.current = true;
    }
  }, [platforms, bodyRef]);

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
      beat.current = b;
      const modal = platforms.find((p) => p.type === "modal");
      const dest =
        modal ||
        pickWanderPlatform(platforms, bodyRef.current?.platformId ?? undefined);
      if (dest && bodyRef.current) {
        phase.current = "outing";
        queue.current = planHops(
          platforms.find((x) => x.id === bodyRef.current!.platformId) ?? null,
          dest,
          platforms,
        );
        const first = queue.current[0];
        if (first) {
          bodyRef.current = jumpToward(bodyRef.current, first);
          setAnim("jump");
        }
      }
    };
    window.addEventListener("animenexus:mascot-theatre", onTheatre);
    return () =>
      window.removeEventListener("animenexus:mascot-theatre", onTheatre);
  }, [platforms, setAnim, bodyRef]);

  useFrame((state, delta) => {
    const dt = Math.min(delta, 0.05);
    const t = state.clock.elapsedTime;
    const motion = motionFromEmotions(emotions);
    const g = root.current;
    const p = pose.current;

    if (!bodyRef.current) {
      const h = homeWorld();
      bodyRef.current = createTerrainBody(h.x, h.y);
      bodyRef.current.onGround = true;
      bodyRef.current.platformId = "home-corner";
    }
    if (!g || !p) return;

    const body = bodyRef.current;
    const home = getHomePlatform(platforms) ?? null;
    const now = Date.now();
    const m = mood.current;
    const hasTerrain = platforms.length > 0;

    if (dragging && dragWorld) {
      body.x = dragWorld.x;
      body.y = dragWorld.y;
      body.vx = 0;
      body.vy = 0;
      body.onGround = false;
      body.platformId = null;
      queue.current = [];
      phase.current = "outing";
      setAnim("surprised");
    } else if (phase.current === "perform" && now < performUntil.current) {
      if (hasTerrain) bodyRef.current = stepTerrain(bodyRef.current, platforms, dt);
    } else {
      if (phase.current === "perform" && now >= performUntil.current) {
        phase.current = "outing";
        beat.current = null;
        homeUntil.current = now + 400;
      }

      const modalOpen = platforms.some((x) => x.type === "modal");

      // HOME: soft idle wander inside the confined pad only
      if (phase.current === "home" && home && body.platformId === "home-corner") {
        padWander.current += dt;
        if (padWander.current > 2.5 + Math.random() * 2) {
          padWander.current = 0;
          const ox = (Math.random() - 0.5) * home.hw * 1.2;
          const oy = (Math.random() - 0.5) * home.hh * 0.8;
          body.x = home.x + ox;
          body.y = home.y + home.hh + oy;
          body.vx = 0;
          body.vy = 0;
          body.onGround = true;
        }
      }

      // Occasional breakout from the corner
      if (
        hasTerrain &&
        phase.current === "home" &&
        now > nextOuting.current &&
        now > homeUntil.current &&
        body.onGround &&
        queue.current.length === 0 &&
        !m.preferNap
      ) {
        const dest = pickWanderPlatform(
          platforms,
          body.platformId ?? undefined,
          modalOpen,
        );
        if (dest && dest.id !== "home-corner") {
          phase.current = "outing";
          beat.current = theatreForPlatform(dest);
          const current =
            platforms.find((x) => x.id === body.platformId) ?? home;
          queue.current = planHops(current, dest, platforms);
          const first = queue.current[0];
          if (first) {
            setAnim("think");
            window.setTimeout(() => {
              if (bodyRef.current) {
                bodyRef.current = jumpToward(bodyRef.current, first);
                setAnim("jump");
              }
            }, 160);
          }
        }
        // Long chill before next attempt
        nextOuting.current =
          now +
          (modalOpen
            ? 5000 + Math.random() * 4000
            : outingIntervalMs(m, lowPower));
      }

      if (
        phase.current === "home" &&
        m.preferNap &&
        anim !== "sleep" &&
        Math.random() < 0.0015
      ) {
        setAnim("sleep");
      }

      if (
        hasTerrain &&
        (phase.current === "outing" || phase.current === "perform") &&
        queue.current.length === 0 &&
        body.onGround &&
        home
      ) {
        if (body.platformId !== "home-corner") {
          if (beat.current && phase.current === "outing") {
            const tb = beat.current;
            const at = platforms.find((x) => x.id === body.platformId);
            if (at) {
              const pos = poseOnPlatform(at, tb.pose);
              body.x = pos.x;
              body.y = pos.y;
              body.vx = 0;
              body.vy = 0;
              body.onGround = true;
            }
            setAnim(tb.anim);
            if (tb.thought) {
              window.dispatchEvent(
                new CustomEvent("animenexus:mascot-thought", {
                  detail: { text: tb.thought, intent: tb.intent },
                }),
              );
            }
            phase.current = "perform";
            performUntil.current = now + tb.holdMs;
          } else if (homeUntil.current === 0) {
            homeUntil.current = now + lingerMs(m);
          } else if (now > homeUntil.current) {
            phase.current = "returning";
            beat.current = null;
            const current =
              platforms.find((x) => x.id === body.platformId) ?? null;
            queue.current = planHops(current, home, platforms);
            const first = queue.current[0];
            if (first && bodyRef.current) {
              bodyRef.current = jumpToward(bodyRef.current, first);
              setAnim("jump");
            }
            homeUntil.current = 0;
          }
        }
      }

      if (
        phase.current === "returning" &&
        queue.current.length === 0 &&
        body.platformId === "home-corner"
      ) {
        phase.current = "home";
        setAnim(m.preferNap ? "sleep" : "idle");
        // Long rest in the corner after a breakout
        homeUntil.current = now + homeRestMs(m);
        nextOuting.current = Math.max(
          nextOuting.current,
          homeUntil.current + outingIntervalMs(m, lowPower) * 0.4,
        );
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
            Math.max(0.5, motion.walkSpeed * 1.4),
          );
          if (anim !== "walk" && anim !== "jump") setAnim("walk");
        }
        if (
          Math.abs(bodyRef.current.x - goal.x) <
            Math.max(0.08, goal.hw * 0.75) &&
          Math.abs(bodyRef.current.y - goalY) < 0.2
        ) {
          bodyRef.current = snapToPlatform(bodyRef.current, goal);
          queue.current.shift();
          if (queue.current.length > 0) {
            const nxt = queue.current[0];
            bodyRef.current = jumpToward(bodyRef.current, nxt);
            setAnim("jump");
          } else if (!(beat.current && phase.current === "outing")) {
            setAnim("idle");
            if (phase.current === "outing") {
              homeUntil.current = Date.now() + lingerMs(m);
            }
          }
        }
      }

      if (phase.current !== "perform" && hasTerrain) {
        bodyRef.current = stepTerrain(bodyRef.current, platforms, dt);
      }

      // Soft clamp while home so they stay in the pad
      if (
        phase.current === "home" &&
        home &&
        body.platformId === "home-corner" &&
        !dragging
      ) {
        const maxDx = home.hw * 0.95;
        const maxDy = home.hh * 0.9;
        body.x = THREE.MathUtils.clamp(body.x, home.x - maxDx, home.x + maxDx);
        body.y = THREE.MathUtils.clamp(
          body.y,
          home.y + home.hh - maxDy,
          home.y + home.hh + maxDy,
        );
      }
    }

    const b = bodyRef.current;
    const proc = sampleProcedural(t, anim, motion, {
      onGround: b.onGround,
      vy: b.vy,
      lookX: lookBias.x,
      lookY: lookBias.y,
      phase:
        dragging
          ? "drag"
          : phase.current === "perform"
            ? "outing"
            : phase.current === "returning"
              ? "returning"
              : phase.current === "outing"
                ? "outing"
                : "home",
    });

    let targetYaw = 0;
    if (Math.abs(b.vx) > 0.04) targetYaw = b.vx > 0 ? -0.28 : 0.28;
    if (dragging || phase.current === "perform" || phase.current === "home") {
      targetYaw = 0;
    }
    facing.current = THREE.MathUtils.lerp(facing.current, targetYaw, 0.14);
    g.rotation.y = facing.current;

    g.position.set(b.x, b.y + 0.06 + proc.bob * 0.6, 0.35);
    // Smaller figure
    const s = 0.58;
    p.scale.set(proc.scaleX * s, proc.scaleY * s, s);

    if (head.current) {
      head.current.rotation.x = THREE.MathUtils.lerp(
        head.current.rotation.x,
        proc.headPitch,
        0.12,
      );
      head.current.rotation.y = THREE.MathUtils.lerp(
        head.current.rotation.y,
        proc.headYaw,
        0.12,
      );
    }

    const eyeScaleY = 1 - proc.blink * 0.92;
    if (eyeL.current) eyeL.current.scale.y = eyeScaleY;
    if (eyeR.current) eyeR.current.scale.y = eyeScaleY;

    if (tip.current) {
      const mat = tip.current.material as THREE.MeshStandardMaterial;
      mat.color.set(m.tipColor);
      mat.emissive.set(m.tipColor);
      mat.emissiveIntensity = Math.max(0.55, proc.tipPulse * m.emissive);
    }

    const world = new THREE.Vector3(b.x, b.y + 0.1, 0.35);
    world.project(camera);
    const sx = (world.x * 0.5 + 0.5) * size.width;
    const sy = (-world.y * 0.5 + 0.5) * size.height;
    onScreenPos({
      x: sx,
      y: sy,
      visible:
        Number.isFinite(sx) &&
        Number.isFinite(sy) &&
        sx > -80 &&
        sx < size.width + 80 &&
        sy > -80 &&
        sy < size.height + 80,
    });
  });

  return (
    <group ref={root}>
      <group ref={pose}>
        <mesh position={[0, -0.12, 0]}>
          <capsuleGeometry args={[0.1, 0.12, 6, 12]} />
          <meshStandardMaterial
            color="#e8a598"
            roughness={0.35}
            metalness={0.08}
          />
        </mesh>
        <group ref={head} position={[0, 0.14, 0]}>
          <mesh>
            <sphereGeometry args={[0.15, 24, 24]} />
            <meshStandardMaterial color="#f5d0c8" roughness={0.3} />
          </mesh>
          <mesh ref={eyeL} position={[-0.045, 0.02, 0.12]}>
            <sphereGeometry args={[0.024, 12, 12]} />
            <meshStandardMaterial color="#2a1810" />
          </mesh>
          <mesh ref={eyeR} position={[0.045, 0.02, 0.12]}>
            <sphereGeometry args={[0.024, 12, 12]} />
            <meshStandardMaterial color="#2a1810" />
          </mesh>
          <mesh position={[-0.08, -0.02, 0.1]}>
            <sphereGeometry args={[0.028, 8, 8]} />
            <meshStandardMaterial color="#f0a090" transparent opacity={0.55} />
          </mesh>
          <mesh position={[0.08, -0.02, 0.1]}>
            <sphereGeometry args={[0.028, 8, 8]} />
            <meshStandardMaterial color="#f0a090" transparent opacity={0.55} />
          </mesh>
          <mesh ref={tip} position={[0, 0.12, 0]}>
            <sphereGeometry args={[0.04, 12, 12]} />
            <meshStandardMaterial
              color="#f0a090"
              emissive="#f0a090"
              emissiveIntensity={0.9}
            />
          </mesh>
        </group>
      </group>
    </group>
  );
}

type Props = {
  reducedMotion?: boolean;
  lowPower?: boolean;
};

export function LiveTerrain({ reducedMotion, lowPower = false }: Props) {
  const [platforms, setPlatforms] = useState<TerrainPlatform[]>([]);
  const [screenPos, setScreenPos] = useState<MascotScreenPos>({
    x: 0,
    y: 0,
    visible: false,
  });
  const [dragging, setDragging] = useState(false);
  const [dragWorld, setDragWorld] = useState<{ x: number; y: number } | null>(
    null,
  );
  const [glError, setGlError] = useState<string | null>(null);
  const bodyRef = useRef<TerrainBody | null>(null);
  const dragMoved = useRef(false);

  useEffect(() => {
    const rebuild = () => {
      try {
        setPlatforms(buildTerrain());
      } catch (err) {
        console.warn("[Lantern-ko] terrain rebuild failed", err);
      }
    };
    const t0 = window.setTimeout(rebuild, 40);
    const t1 = window.setTimeout(rebuild, 250);
    const t2 = window.setTimeout(rebuild, 800);
    const id = window.setInterval(rebuild, lowPower ? 1600 : 900);
    window.addEventListener("resize", rebuild);
    window.addEventListener("scroll", rebuild, { passive: true });
    return () => {
      window.clearTimeout(t0);
      window.clearTimeout(t1);
      window.clearTimeout(t2);
      window.clearInterval(id);
      window.removeEventListener("resize", rebuild);
      window.removeEventListener("scroll", rebuild);
    };
  }, [lowPower]);

  const onPointerDown = useCallback((e: React.PointerEvent) => {
    e.preventDefault();
    e.stopPropagation();
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
    dragMoved.current = false;
    setDragging(true);
    setDragWorld(screenToWorld(e.clientX, e.clientY));
  }, []);

  const onPointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!dragging) return;
      e.preventDefault();
      dragMoved.current = true;
      setDragWorld(screenToWorld(e.clientX, e.clientY));
    },
    [dragging],
  );

  const onPointerUp = useCallback(
    (e: React.PointerEvent) => {
      e.preventDefault();
      setDragging(false);
      const w = screenToWorld(e.clientX, e.clientY);
      setDragWorld(null);
      if (!bodyRef.current) return;
      if (!dragMoved.current) {
        useMascotStore.getState().dispatch({ type: "click" });
        return;
      }
      let best: TerrainPlatform | null = null;
      let bestD = 0.4;
      for (const p of platforms) {
        if (p.type === "floor") continue;
        const d = Math.hypot(w.x - p.x, w.y - (p.y + p.hh));
        if (d < bestD) {
          bestD = d;
          best = p;
        }
      }
      if (best) bodyRef.current = snapToPlatform(bodyRef.current, best);
      else {
        bodyRef.current.x = w.x;
        bodyRef.current.y = w.y;
        bodyRef.current.vy = 0;
        bodyRef.current.onGround = false;
        bodyRef.current.platformId = null;
      }
      useMascotStore.getState().dispatch({ type: "pet" });
    },
    [platforms],
  );

  if (reducedMotion) return null;

  if (glError) {
    return (
      <div className="mascot-error" role="alert">
        <strong>3D companion failed</strong>
        <p>{glError}</p>
        <button
          type="button"
          className="mascot-error-retry"
          onClick={() => {
            setGlError(null);
            window.location.reload();
          }}
        >
          Reload
        </button>
      </div>
    );
  }

  return (
    <>
      <div className="live-terrain" aria-hidden>
        <Canvas
          className="live-terrain-canvas"
          orthographic
          dpr={lowPower ? [1, 1.5] : [1, 2]}
          gl={{
            alpha: true,
            antialias: true,
            powerPreference: "high-performance",
            failIfMajorPerformanceCaveat: false,
            premultipliedAlpha: true,
          }}
          frameloop="always"
          camera={{
            position: [0, 0, 5],
            zoom: 1,
            near: 0.1,
            far: 20,
          }}
          style={{ pointerEvents: "none", width: "100%", height: "100%" }}
          onCreated={({ gl }) => {
            gl.setClearColor(0x000000, 0);
            const ctx = gl.getContext();
            if (!ctx) {
              setGlError("WebGL context lost after Canvas create.");
            }
          }}
          onError={(err) => {
            console.error("[Lantern-ko] Canvas error", err);
            setGlError(
              err instanceof Error ? err.message : "Canvas failed to initialize",
            );
          }}
        >
          <OrthoCamera />
          <ambientLight intensity={1.15} />
          <directionalLight position={[2.5, 3.5, 5]} intensity={1.0} />
          <directionalLight position={[-2, 1, 3]} intensity={0.4} />
          <pointLight
            position={[1.0, -0.3, 2]}
            intensity={0.7}
            distance={5}
            color="#f0a090"
          />
          <Actor
            platforms={platforms}
            lowPower={lowPower}
            dragging={dragging}
            dragWorld={dragWorld}
            onScreenPos={setScreenPos}
            bodyRef={bodyRef}
          />
        </Canvas>
      </div>
      {screenPos.visible ? (
        <button
          type="button"
          className={
            "mascot-drag-handle" +
            (dragging ? " mascot-drag-handle--active" : "")
          }
          style={{ left: screenPos.x, top: screenPos.y }}
          aria-label="Drag Lantern-ko"
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
        />
      ) : null}
    </>
  );
}
