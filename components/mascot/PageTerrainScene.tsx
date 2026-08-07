"use client";

import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import {
  buildTerrain,
  pickWanderPlatform,
  planHops,
  scrollLandmarkIntoView,
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

function PlatformMeshes({
  platforms,
  highlightId,
  onSelect,
}: {
  platforms: TerrainPlatform[];
  highlightId: string | null;
  onSelect: (p: TerrainPlatform) => void;
}) {
  return (
    <group>
      {platforms.map((p) => {
        const active = p.id === highlightId;
        const isFloor = p.type === "floor";
        return (
          <mesh
            key={p.id}
            position={[p.x, p.y, isFloor ? -0.05 : 0]}
            onClick={(e) => {
              e.stopPropagation();
              if (!isFloor) onSelect(p);
            }}
          >
            <boxGeometry args={[p.hw * 2, p.hh * 2, active ? 0.06 : 0.03]} />
            <meshStandardMaterial
              color={active ? "#f0a090" : p.type === "card" ? "#5a4a40" : "#3a302c"}
              transparent
              opacity={isFloor ? 0.12 : active ? 0.55 : 0.28}
              roughness={0.85}
              emissive={active ? "#f0a090" : "#000000"}
              emissiveIntensity={active ? 0.35 : 0}
            />
          </mesh>
        );
      })}
    </group>
  );
}

function CameraFit() {
  const { camera, size } = useThree();
  useEffect(() => {
    const cam = camera as THREE.PerspectiveCamera;
    cam.position.set(0, 0, 3.1);
    cam.lookAt(0, 0, 0);
    cam.fov = 48;
    cam.aspect = size.width / size.height;
    cam.updateProjectionMatrix();
  }, [camera, size]);
  return null;
}

function TerrainActor({
  platforms,
  onPlatform,
}: {
  platforms: TerrainPlatform[];
  onPlatform: (id: string | null) => void;
}) {
  const root = useRef<THREE.Group>(null);
  const pose = useRef<THREE.Group>(null);
  const body = useRef<TerrainBody>(createTerrainBody());
  const queue = useRef<TerrainPlatform[]>([]);
  const nextPick = useRef(Date.now() + 2500);
  const emotions = useMascotStore((s) => s.emotions);
  const setAnim = useMascotStore((s) => s.setAnim);
  const requestAnim = useMascotStore((s) => s.requestAnim);
  const anim = useMascotStore((s) => s.anim);

  useEffect(() => {
    const onGoto = (e: Event) => {
      const p = (e as CustomEvent).detail as TerrainPlatform;
      const current =
        platforms.find((x) => x.id === body.current.platformId) ?? null;
      queue.current = planHops(current, p, platforms);
      const first = queue.current[0];
      if (first && body.current.onGround) {
        body.current = jumpToward(body.current, first);
        setAnim("jump");
        onPlatform(first.id);
      }
    };
    window.addEventListener("mascot:terrain-goto", onGoto);
    return () => window.removeEventListener("mascot:terrain-goto", onGoto);
  }, [platforms, setAnim, onPlatform]);

  useFrame((state, delta) => {
    const dt = Math.min(delta, 0.05);
    const t = state.clock.elapsedTime;
    const motion = motionFromEmotions(emotions);
    const g = root.current;
    const p = pose.current;
    if (!g || !p || !platforms.length) return;

    // Auto-wander when queue empty
    if (
      Date.now() > nextPick.current &&
      body.current.onGround &&
      queue.current.length === 0
    ) {
      const next = pickWanderPlatform(
        platforms,
        body.current.platformId ?? undefined,
      );
      if (next) {
        const current =
          platforms.find((x) => x.id === body.current.platformId) ?? null;
        queue.current = planHops(current, next, platforms);
        const first = queue.current[0];
        if (first) {
          if (first.y + first.hh > body.current.y + 0.1 || Math.random() < 0.45) {
            body.current = jumpToward(body.current, first);
            setAnim("jump");
          } else setAnim("walk");
          onPlatform(first.id);
        }
      }
      nextPick.current = Date.now() + 4500 + Math.random() * 3500;
    }

    const goal = queue.current[0];
    if (goal) {
      const goalY = goal.y + goal.hh;
      if (body.current.onGround) {
        body.current = steerTerrain(
          body.current,
          goal.x,
          goalY,
          Math.max(0.5, motion.walkSpeed * 1.35),
        );
      }
      if (
        Math.abs(body.current.x - goal.x) < Math.max(0.1, goal.hw * 0.65) &&
        Math.abs(body.current.y - goalY) < 0.2
      ) {
        body.current = snapToPlatform(body.current, goal);
        queue.current.shift();
        onPlatform(goal.id);
        scrollLandmarkIntoView(goal);

        if (queue.current.length === 0) {
          setAnim("idle");
          if (Math.random() < 0.4) requestAnim({ anim: "wave", holdMs: 900 });
          else if (Math.random() < 0.25)
            requestAnim({ anim: "point", holdMs: 1000 });
        } else {
          // Continue hop chain
          const next = queue.current[0];
          body.current = jumpToward(body.current, next);
          setAnim("jump");
          onPlatform(next.id);
        }
      }
    }

    body.current = stepTerrain(body.current, platforms, dt);
    if (body.current.platformId) onPlatform(body.current.platformId);

    g.position.set(body.current.x, body.current.y + 0.1, 0.25);
    if (Math.abs(body.current.vx) > 0.04) {
      g.rotation.y = THREE.MathUtils.lerp(
        g.rotation.y,
        body.current.vx > 0 ? 0.5 : -0.5,
        0.12,
      );
    }

    const breathe = Math.sin(t * 2.2) * 0.012;
    const walkBob =
      anim === "walk" && body.current.onGround
        ? Math.abs(Math.sin(t * 10)) * 0.03
        : anim === "jump"
          ? 0.04
          : 0;
    p.position.y = walkBob + breathe;
    p.scale.setScalar(0.52 * (anim === "jump" ? 1.06 : 1));
  });

  return (
    <group
      ref={root}
      onClick={(e) => {
        e.stopPropagation();
        useMascotStore.getState().dispatch({ type: "click" });
      }}
    >
      <group ref={pose}>
        <mesh position={[0, -0.12, 0]}>
          <capsuleGeometry args={[0.1, 0.12, 4, 8]} />
          <meshStandardMaterial color="#e8a598" />
        </mesh>
        <mesh position={[0, 0.15, 0]}>
          <sphereGeometry args={[0.16, 16, 16]} />
          <meshStandardMaterial color="#f5d0c8" />
        </mesh>
        <mesh position={[0, 0.28, 0]}>
          <sphereGeometry args={[0.04, 8, 8]} />
          <meshStandardMaterial
            color="#f0a090"
            emissive="#f0a090"
            emissiveIntensity={0.75}
          />
        </mesh>
      </group>
    </group>
  );
}

type Props = {
  onClose: () => void;
  reducedMotion?: boolean;
};

export function PageTerrainScene({ onClose, reducedMotion }: Props) {
  const [platforms, setPlatforms] = useState<TerrainPlatform[]>([]);
  const [highlightId, setHighlightId] = useState<string | null>(null);

  useEffect(() => {
    const rebuild = () => setPlatforms(buildTerrain());
    rebuild();
    const id = window.setInterval(rebuild, 1000);
    window.addEventListener("resize", rebuild);
    window.addEventListener("scroll", rebuild, { passive: true });
    return () => {
      window.clearInterval(id);
      window.removeEventListener("resize", rebuild);
      window.removeEventListener("scroll", rebuild);
    };
  }, []);

  const onSelect = (p: TerrainPlatform) => {
    window.dispatchEvent(new CustomEvent("mascot:terrain-goto", { detail: p }));
    setHighlightId(p.id);
  };

  return (
    <div className="page-terrain-overlay" role="dialog" aria-label="Page terrain">
      <div className="page-terrain-chrome">
        <span className="page-terrain-title">Terrain</span>
        <span className="page-terrain-hint">
          Ghost slabs = UI · tap to path · they hop on their own
        </span>
        <button type="button" className="page-terrain-close" onClick={onClose}>
          Exit
        </button>
      </div>
      <Canvas
        className="page-terrain-canvas"
        dpr={[1, 1.5]}
        gl={{
          alpha: true,
          antialias: true,
          powerPreference: "low-power",
        }}
        frameloop={reducedMotion ? "demand" : "always"}
        camera={{ position: [0, 0, 3.1], fov: 48 }}
      >
        <CameraFit />
        <ambientLight intensity={0.75} />
        <directionalLight position={[2, 3, 4]} intensity={0.85} />
        <PlatformMeshes
          platforms={platforms}
          highlightId={highlightId}
          onSelect={onSelect}
        />
        <TerrainActor platforms={platforms} onPlatform={setHighlightId} />
      </Canvas>
    </div>
  );
}
