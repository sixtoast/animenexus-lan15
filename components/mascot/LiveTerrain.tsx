"use client";

/**
 * Full-viewport 3D companion (R3F).
 * Home pad bottom-right · climbs DOM platforms · drag via HTML handle.
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
import { worldMood, outingIntervalMs, lingerMs } from "@/lib/mascot/living-world";
import { sampleProcedural } from "@/lib/mascot/procedural-motion";
import {
  poseOnPlatform,
  theatreForPlatform,
  type TheatreBeat,
} from "@/lib/mascot/ui-theatre";

type Phase = "home" | "outing" | "returning" | "perform";

export type MascotScreenPos = { x: number; y: number; visible: boolean };

/** Stable bottom-right home in world units for current viewport aspect. */
function homeWorld(): { x: number; y: number } {
  if (typeof window === "undefined") return { x: 0.95, y: -0.7 };
  const aspect = window.innerWidth / (window.innerHeight || 1);
  const maxX = Math.min(aspect * 0.78, 1.35);
  return { x: maxX, y: -0.68 };
}

function CameraFit() {
  const { camera, size } = useThree();
  useEffect(() => {
    const cam = camera as THREE.PerspectiveCamera;
    cam.position.set(0, 0, 3.0);
    cam.lookAt(0, 0, 0);
    cam.fov = 50;
    cam.near = 0.1;
    cam.far = 20;
    cam.aspect = size.width / Math.max(size.height, 1);
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
  const emotions = useMascotStore((s) => s.emotions);
  const setAnim = useMascotStore((s) => s.setAnim);
  const anim = useMascotStore((s) => s.anim);
  const lookBias = useMascotStore((s) => s.lookBias);
  const { camera, size } = useThree();

  useEffect(() => {
    if (seeded.current && bodyRef.current) return;
    const home = getHomePlatform(platforms);
    if (home) {
      bodyRef.current = snapToPlatform(createTerrainBody(), home);
    } else {
      const h = homeWorld();
      bodyRef.current = createTerrainBody(h.x, h.y);
      bodyRef.current.onGround = true;
      bodyRef.current.platformId = "home-corner";
    }
    seeded.current = true;
  }, [platforms, bodyRef]);

  useEffect(() => {
    const home = getHomePlatform(platforms);
    if (!home || !bodyRef.current) return;
    if (
      bodyRef.current.platformId === "home-corner" ||
      bodyRef.current.platformId === null
    ) {
      if (phase.current === "home" && queue.current.length === 0) {
        bodyRef.current = snapToPlatform(bodyRef.current, home);
      }
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
      if (hasTerrain) {
        bodyRef.current = stepTerrain(bodyRef.current, platforms, dt);
      }
    } else {
      if (phase.current === "perform" && now >= performUntil.current) {
        phase.current = "outing";
        beat.current = null;
        homeUntil.current = now + 400;
      }

      const modalOpen = platforms.some((x) => x.type === "modal");

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
            }, 120);
          }
        }
        nextOuting.current =
          now +
          (modalOpen
            ? 3500 + Math.random() * 2500
            : outingIntervalMs(m, lowPower));
      }

      if (
        phase.current === "home" &&
        m.preferNap &&
        anim !== "sleep" &&
        Math.random() < 0.002
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
        homeUntil.current = 0;
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
          } else if (beat.current && phase.current === "outing") {
            // perform next frame
          } else {
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

    let leanZ = 0;
    if (phase.current === "perform" && beat.current?.move === "sit-edge") {
      leanZ = 0.08;
    }
    if (phase.current === "perform" && beat.current?.move === "lean") {
      leanZ = 0.12;
    }

    g.position.set(b.x, b.y + 0.1 + proc.bob, 0.35 + leanZ);
    const s = 0.95;
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
      mat.emissiveIntensity = proc.tipPulse * m.emissive;
    }

    const world = new THREE.Vector3(b.x, b.y + 0.15, 0.35);
    world.project(camera);
    const sx = (world.x * 0.5 + 0.5) * size.width;
    const sy = (-world.y * 0.5 + 0.5) * size.height;
    const inView =
      world.z < 1 &&
      world.z > -1 &&
      sx > -40 &&
      sx < size.width + 40 &&
      sy > -40 &&
      sy < size.height + 40;
    onScreenPos({ x: sx, y: sy, visible: inView });
  });

  // Meshes inlined so refs type-check against R3F without RefObject null friction
  return (
    <group ref={root}>
      <group ref={pose}>
        <mesh position={[0, -0.12, 0]}>
          <capsuleGeometry args={[0.11, 0.14, 6, 12]} />
          <meshStandardMaterial
            color="#e8a598"
            roughness={0.4}
            metalness={0.05}
          />
        </mesh>
        <group ref={head} position={[0, 0.16, 0]}>
          <mesh>
            <sphereGeometry args={[0.17, 24, 24]} />
            <meshStandardMaterial color="#f5d0c8" roughness={0.35} />
          </mesh>
          <mesh ref={eyeL} position={[-0.05, 0.02, 0.14]}>
            <sphereGeometry args={[0.028, 12, 12]} />
            <meshStandardMaterial color="#2a1810" />
          </mesh>
          <mesh ref={eyeR} position={[0.05, 0.02, 0.14]}>
            <sphereGeometry args={[0.028, 12, 12]} />
            <meshStandardMaterial color="#2a1810" />
          </mesh>
          <mesh position={[-0.085, -0.02, 0.12]}>
            <sphereGeometry args={[0.03, 8, 8]} />
            <meshStandardMaterial color="#f0a090" transparent opacity={0.55} />
          </mesh>
          <mesh position={[0.085, -0.02, 0.12]}>
            <sphereGeometry args={[0.03, 8, 8]} />
            <meshStandardMaterial color="#f0a090" transparent opacity={0.55} />
          </mesh>
          <mesh ref={tip} position={[0, 0.14, 0]}>
            <sphereGeometry args={[0.045, 12, 12]} />
            <meshStandardMaterial
              color="#f0a090"
              emissive="#f0a090"
              emissiveIntensity={0.85}
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
  onVisibleChange?: (visible: boolean) => void;
};

export function LiveTerrain({
  reducedMotion,
  lowPower = false,
  onVisibleChange,
}: Props) {
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
  const bodyRef = useRef<TerrainBody | null>(null);
  const dragMoved = useRef(false);

  useEffect(() => {
    onVisibleChange?.(screenPos.visible);
  }, [screenPos.visible, onVisibleChange]);

  useEffect(() => {
    const rebuild = () => {
      try {
        setPlatforms(buildTerrain());
      } catch (err) {
        console.warn("[Lantern-ko] terrain rebuild failed", err);
      }
    };
    const t0 = window.setTimeout(rebuild, 50);
    const t1 = window.setTimeout(rebuild, 300);
    const t2 = window.setTimeout(rebuild, 1000);
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

  return (
    <>
      <div className="live-terrain" aria-hidden>
        <Canvas
          className="live-terrain-canvas"
          dpr={lowPower ? [1, 1.25] : [1, 1.75]}
          gl={{
            alpha: true,
            antialias: true,
            powerPreference: lowPower ? "low-power" : "default",
            failIfMajorPerformanceCaveat: false,
            premultipliedAlpha: true,
          }}
          frameloop="always"
          camera={{ position: [0, 0, 3.0], fov: 50, near: 0.1, far: 20 }}
          style={{ pointerEvents: "none" }}
          onCreated={({ gl }) => {
            gl.setClearColor(0x000000, 0);
          }}
        >
          <CameraFit />
          <ambientLight intensity={1.05} />
          <directionalLight position={[2.5, 3.5, 4]} intensity={0.9} />
          <directionalLight position={[-2, 1, 2]} intensity={0.35} />
          <pointLight
            position={[0.9, -0.4, 1.2]}
            intensity={0.55}
            distance={4}
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
