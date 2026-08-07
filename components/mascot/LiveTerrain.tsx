"use client";

/**
 * Corner home + UI theatre climbs (Sprint 4).
 */

import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useEffect, useRef, useState, useCallback } from "react";
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

function CameraFit() {
  const { camera, size } = useThree();
  useEffect(() => {
    const cam = camera as THREE.PerspectiveCamera;
    cam.position.set(0, 0, 3.0);
    cam.lookAt(0, 0, 0);
    cam.fov = 50;
    cam.aspect = size.width / size.height;
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
  bodyRef: React.MutableRefObject<TerrainBody | null>;
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
  const nextOuting = useRef(Date.now() + outingIntervalMs(mood.current, lowPower));
  const homeUntil = useRef(0);
  const performUntil = useRef(0);
  const beat = useRef<TheatreBeat | null>(null);
  const facing = useRef(0);
  const emotions = useMascotStore((s) => s.emotions);
  const setAnim = useMascotStore((s) => s.setAnim);
  const requestAnim = useMascotStore((s) => s.requestAnim);
  const anim = useMascotStore((s) => s.anim);
  const lookBias = useMascotStore((s) => s.lookBias);
  const { camera, size } = useThree();

  useEffect(() => {
    const home = getHomePlatform(platforms);
    if (home) {
      bodyRef.current = snapToPlatform(createTerrainBody(), home);
    } else if (!bodyRef.current) {
      bodyRef.current = createTerrainBody(0.9, -0.7);
    }
  }, [platforms.length, bodyRef]);

  useEffect(() => {
    const id = window.setInterval(() => {
      mood.current = worldMood();
    }, 60_000);
    mood.current = worldMood();
    return () => window.clearInterval(id);
  }, []);

  // Modal / forced theatre beats
  useEffect(() => {
    const onTheatre = (e: Event) => {
      const b = (e as CustomEvent).detail as TheatreBeat;
      beat.current = b;
      // Prefer modal platform if any
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
    return () => window.removeEventListener("animenexus:mascot-theatre", onTheatre);
  }, [platforms, setAnim, bodyRef]);

  useFrame((state, delta) => {
    const dt = Math.min(delta, 0.05);
    const t = state.clock.elapsedTime;
    const motion = motionFromEmotions(emotions);
    const g = root.current;
    const p = pose.current;
    if (!g || !p || !bodyRef.current || platforms.length < 1) return;

    const body = bodyRef.current;
    const home = getHomePlatform(platforms);
    const now = Date.now();
    const m = mood.current;

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
      // Hold performance pose — light idle physics
      bodyRef.current = stepTerrain(bodyRef.current, platforms, dt);
    } else {
      if (phase.current === "perform" && now >= performUntil.current) {
        phase.current = "outing";
        beat.current = null;
        homeUntil.current = now + 400;
      }

      const modalOpen = platforms.some((x) => x.type === "modal");

      if (
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
        (phase.current === "outing" || phase.current === "perform") &&
        queue.current.length === 0 &&
        body.onGround &&
        home
      ) {
        if (body.platformId !== "home-corner") {
          // Arrive → perform theatre beat
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
            // will enter perform next frame
          } else {
            setAnim("idle");
            if (phase.current === "outing") {
              homeUntil.current = Date.now() + lingerMs(m);
            }
          }
        }
      }

      if (phase.current !== "perform") {
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
    if (Math.abs(b.vx) > 0.04) targetYaw = b.vx > 0 ? -0.35 : 0.35;
    if (dragging) targetYaw = 0;
    // Sit/lean poses face camera more
    if (phase.current === "perform") targetYaw = 0;
    facing.current = THREE.MathUtils.lerp(facing.current, targetYaw, 0.12);
    g.rotation.y = facing.current;

    // Sit-edge: slight lean
    let leanZ = 0;
    if (phase.current === "perform" && beat.current?.move === "sit-edge") {
      leanZ = 0.08;
    }
    if (phase.current === "perform" && beat.current?.move === "lean") {
      leanZ = 0.12;
    }

    g.position.set(b.x, b.y + 0.08 + proc.bob, 0.3 + leanZ);
    p.scale.set(proc.scaleX * 0.5, proc.scaleY * 0.5, 0.5);

    if (head.current) {
      head.current.rotation.x = THREE.MathUtils.lerp(
        head.current.rotation.x,
        proc.headPitch,
        0.1,
      );
      head.current.rotation.y = THREE.MathUtils.lerp(
        head.current.rotation.y,
        proc.headYaw,
        0.1,
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

    const world = new THREE.Vector3(b.x, b.y + 0.12, 0.3);
    world.project(camera);
    onScreenPos({
      x: (world.x * 0.5 + 0.5) * size.width,
      y: (-world.y * 0.5 + 0.5) * size.height,
      visible: world.z < 1 && world.z > -1,
    });
  });

  return (
    <group ref={root}>
      <group ref={pose}>
        <mesh position={[0, -0.1, 0]}>
          <capsuleGeometry args={[0.09, 0.11, 4, 8]} />
          <meshStandardMaterial color="#e8a598" roughness={0.45} />
        </mesh>
        <group ref={head} position={[0, 0.13, 0]}>
          <mesh>
            <sphereGeometry args={[0.14, 16, 16]} />
            <meshStandardMaterial color="#f5d0c8" roughness={0.4} />
          </mesh>
          <mesh ref={eyeL} position={[-0.045, 0.01, 0.12]}>
            <sphereGeometry args={[0.022, 10, 10]} />
            <meshStandardMaterial color="#2a1810" />
          </mesh>
          <mesh ref={eyeR} position={[0.045, 0.01, 0.12]}>
            <sphereGeometry args={[0.022, 10, 10]} />
            <meshStandardMaterial color="#2a1810" />
          </mesh>
          <mesh position={[-0.07, -0.02, 0.1]}>
            <sphereGeometry args={[0.025, 8, 8]} />
            <meshStandardMaterial color="#f0a090" transparent opacity={0.5} />
          </mesh>
          <mesh position={[0.07, -0.02, 0.1]}>
            <sphereGeometry args={[0.025, 8, 8]} />
            <meshStandardMaterial color="#f0a090" transparent opacity={0.5} />
          </mesh>
          <mesh ref={tip} position={[0, 0.11, 0]}>
            <sphereGeometry args={[0.035, 8, 8]} />
            <meshStandardMaterial
              color="#f0a090"
              emissive="#f0a090"
              emissiveIntensity={0.55}
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
  const bodyRef = useRef<TerrainBody | null>(null);
  const dragMoved = useRef(false);

  useEffect(() => {
    const rebuild = () => setPlatforms(buildTerrain());
    const t0 = window.setTimeout(rebuild, 80);
    const t1 = window.setTimeout(rebuild, 400);
    const id = window.setInterval(rebuild, lowPower ? 1800 : 1100);
    window.addEventListener("resize", rebuild);
    window.addEventListener("scroll", rebuild, { passive: true });
    return () => {
      window.clearTimeout(t0);
      window.clearTimeout(t1);
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
      let bestD = 0.35;
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
          dpr={lowPower ? [1, 1] : [1, 1.4]}
          gl={{
            alpha: true,
            antialias: !lowPower,
            powerPreference: "low-power",
            failIfMajorPerformanceCaveat: false,
          }}
          frameloop="always"
          camera={{ position: [0, 0, 3.0], fov: 50 }}
          style={{ pointerEvents: "none" }}
        >
          <CameraFit />
          <ambientLight intensity={0.85} />
          <directionalLight position={[2, 3, 4]} intensity={0.65} />
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
