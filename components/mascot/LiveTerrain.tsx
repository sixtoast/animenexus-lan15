"use client";

/**
 * 3D companion — idle locked to home pad (visible boundary).
 * No auto-climb. Scroll cannot snap them onto UI.
 * Leave pad only via drag or explicit theatre events.
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
import { worldMood, lingerMs, homeRestMs } from "@/lib/mascot/living-world";
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

/** Visible home pad boundary in the 3D scene */
function HomePadBox({ home }: { home: TerrainPlatform | null }) {
  if (!home) return null;
  const w = home.hw * 2;
  const h = home.hh * 2.2;
  return (
    <group position={[home.x, home.y + home.hh, 0.05]}>
      <mesh>
        <planeGeometry args={[w, h]} />
        <meshBasicMaterial
          color="#f0a090"
          transparent
          opacity={0.08}
          depthWrite={false}
        />
      </mesh>
      <lineSegments>
        <edgesGeometry args={[new THREE.PlaneGeometry(w, h)]} />
        <lineBasicMaterial color="#f0a090" transparent opacity={0.55} />
      </lineSegments>
    </group>
  );
}

function Actor({
  platforms,
  dragging,
  dragWorld,
  onScreenPos,
  bodyRef,
  phaseRef,
}: {
  platforms: TerrainPlatform[];
  dragging: boolean;
  dragWorld: { x: number; y: number } | null;
  onScreenPos: (p: MascotScreenPos) => void;
  bodyRef: MutableRefObject<TerrainBody | null>;
  phaseRef: MutableRefObject<Phase>;
}) {
  const root = useRef<THREE.Group>(null);
  const pose = useRef<THREE.Group>(null);
  const head = useRef<THREE.Group>(null);
  const tip = useRef<THREE.Mesh>(null);
  const eyeL = useRef<THREE.Mesh>(null);
  const eyeR = useRef<THREE.Mesh>(null);
  const queue = useRef<TerrainPlatform[]>([]);
  const mood = useRef(worldMood());
  const homeUntil = useRef(0);
  const performUntil = useRef(0);
  const beat = useRef<TheatreBeat | null>(null);
  const facing = useRef(0);
  const seeded = useRef(false);
  const padWander = useRef(0);
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
    if (home) {
      // Always re-anchor to home pad when idle — never to scrolled UI
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

  // Explicit theatre only — not scroll, not idle timers
  useEffect(() => {
    const onTheatre = (e: Event) => {
      const b = (e as CustomEvent).detail as TheatreBeat;
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
          bodyRef.current = jumpToward(bodyRef.current, first);
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
    const phase = phaseRef.current;

    // —— DRAG ——
    if (dragging && dragWorld) {
      body.x = dragWorld.x;
      body.y = dragWorld.y;
      body.vx = 0;
      body.vy = 0;
      body.onGround = false;
      body.platformId = null;
      queue.current = [];
      phaseRef.current = "outing";
      setAnim("surprised");
    }
    // —— IDLE HOME: locked to pad, no climbing, no stepTerrain on page UI ——
    else if (phase === "home") {
      if (home) {
        // Micro-idle inside pad only
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
      }
      // No auto-outing. Stay put.
      if (m.preferNap && anim !== "sleep" && Math.random() < 0.001) {
        setAnim("sleep");
      } else if (anim !== "sleep" && anim !== "idle") {
        setAnim("idle");
      }
    }
    // —— OUTING / PERFORM / RETURNING (only after drag or theatre) ——
    else {
      if (phase === "perform" && now >= performUntil.current) {
        phaseRef.current = "outing";
        beat.current = null;
        homeUntil.current = now + 400;
      }

      if (phase === "perform" && now < performUntil.current) {
        // hold pose
      } else if (
        (phase === "outing" || phase === "perform") &&
        queue.current.length === 0 &&
        body.onGround &&
        home
      ) {
        if (body.platformId !== "home-corner") {
          if (beat.current && phase === "outing") {
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
            phaseRef.current = "perform";
            performUntil.current = now + tb.holdMs;
          } else if (homeUntil.current === 0) {
            homeUntil.current = now + lingerMs(m);
          } else if (now > homeUntil.current) {
            phaseRef.current = "returning";
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
        } else {
          // already on home while "outing" → settle
          phaseRef.current = "home";
          setAnim("idle");
          homeUntil.current = now + homeRestMs(m);
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
          } else if (!(beat.current && phaseRef.current === "outing")) {
            setAnim("idle");
            if (phaseRef.current === "outing") {
              homeUntil.current = Date.now() + lingerMs(m);
            }
          }
        }
      }

      // Physics only while actively out — not while home
      if (phaseRef.current !== "home" && phaseRef.current !== "perform") {
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
          : phaseRef.current === "perform" || phaseRef.current === "outing"
            ? "outing"
            : phaseRef.current === "returning"
              ? "returning"
              : "home",
    });

    let targetYaw = 0;
    if (Math.abs(b.vx) > 0.04) targetYaw = b.vx > 0 ? -0.28 : 0.28;
    if (
      dragging ||
      phaseRef.current === "perform" ||
      phaseRef.current === "home"
    ) {
      targetYaw = 0;
    }
    facing.current = THREE.MathUtils.lerp(facing.current, targetYaw, 0.14);
    g.rotation.y = facing.current;

    g.position.set(b.x, b.y + 0.06 + proc.bob * 0.6, 0.35);
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
  const phaseRef = useRef<Phase>("home");
  const dragMoved = useRef(false);

  const home = platforms.find((p) => p.id === "home-corner") ?? null;

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
    // Rebuild less often — scroll must not feel like an outing trigger
    const id = window.setInterval(rebuild, lowPower ? 2500 : 1800);
    window.addEventListener("resize", rebuild);
    // Scroll only updates card positions for future drag landings — idle ignores them
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
        // Click while idle keeps them home
        const h = getHomePlatform(platforms);
        if (h && phaseRef.current === "home") {
          bodyRef.current = snapToPlatform(bodyRef.current, h);
        }
        return;
      }

      // Drag-drop: land on nearest platform, else return home
      let best: TerrainPlatform | null = null;
      let bestD = 0.35;
      for (const p of platforms) {
        if (p.type === "floor" || p.type === "home") continue;
        const d = Math.hypot(w.x - p.x, w.y - (p.y + p.hh));
        if (d < bestD) {
          bestD = d;
          best = p;
        }
      }
      if (best) {
        bodyRef.current = snapToPlatform(bodyRef.current, best);
        phaseRef.current = "outing";
        useMascotStore.getState().dispatch({ type: "pet" });
      } else {
        const h = getHomePlatform(platforms);
        if (h) {
          bodyRef.current = snapToPlatform(bodyRef.current, h);
          phaseRef.current = "home";
        }
        useMascotStore.getState().dispatch({ type: "pet" });
      }
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
      {/* HTML pad outline — always visible while companion is on */}
      <div className="mascot-home-pad" aria-hidden />

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
            if (!gl.getContext()) {
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
          <HomePadBox home={home} />
          <Actor
            platforms={platforms}
            dragging={dragging}
            dragWorld={dragWorld}
            onScreenPos={setScreenPos}
            bodyRef={bodyRef}
            phaseRef={phaseRef}
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
