"use client";

import { Canvas, ThreeEvent } from "@react-three/fiber";
import { ContactShadows, Environment } from "@react-three/drei";
import { PlaceholderChibi } from "./PlaceholderChibi";
import { HabitatPlatforms } from "./HabitatPlatforms";
import { useMascotStore } from "@/lib/mascot/store";
import { clampToHabitat } from "@/lib/mascot/navigation";
import { tryRunSkit } from "@/lib/mascot/run-skit";
import { HABITAT_LIGHTING, CANVAS_GL } from "@/lib/mascot/visual";
import {
  budgetFor,
  detectPerfTier,
  isPageActive,
  noteBehaviourTick,
} from "@/lib/mascot/performance";
import { useEffect, useMemo } from "react";

type Props = {
  reducedMotion?: boolean;
  lowPower?: boolean;
};

function Floor() {
  const dispatch = useMascotStore((s) => s.dispatch);

  return (
    <mesh
      rotation={[-Math.PI / 2, 0, 0]}
      position={[0, -0.72, 0]}
      onClick={(e: ThreeEvent<MouseEvent>) => {
        e.stopPropagation();
        const t = clampToHabitat(e.point.x, e.point.z);
        dispatch({ type: "go-to", x: t.x, y: t.y });
      }}
    >
      <planeGeometry args={[1.4, 0.8]} />
      <meshStandardMaterial
        color="#1a1512"
        transparent
        opacity={0.12}
        roughness={1}
      />
    </mesh>
  );
}

function SceneContent({ reducedMotion }: { reducedMotion?: boolean }) {
  const L = HABITAT_LIGHTING;
  return (
    <>
      <ambientLight intensity={L.ambient.intensity} color={L.ambient.color} />
      <directionalLight
        position={L.key.position}
        intensity={L.key.intensity}
        color={L.key.color}
      />
      <pointLight
        position={L.fill.position}
        intensity={L.fill.intensity}
        color={L.fill.color}
      />
      <PlaceholderChibi />
      <Floor />
      <HabitatPlatforms />
      {!reducedMotion ? (
        <ContactShadows
          position={[0, -0.72, 0]}
          opacity={L.contactShadow.opacity}
          scale={L.contactShadow.scale}
          blur={L.contactShadow.blur}
          far={L.contactShadow.far}
        />
      ) : null}
      {!reducedMotion ? (
        <Environment preset="warehouse" environmentIntensity={0.22} />
      ) : null}
    </>
  );
}

export function MascotScene({ reducedMotion, lowPower }: Props) {
  const runBehaviourTick = useMascotStore((s) => s.runBehaviourTick);
  const budget = useMemo(
    () => budgetFor(detectPerfTier({ lowPower })),
    [lowPower],
  );

  useEffect(() => {
    if (reducedMotion) return;
    const id = window.setInterval(() => {
      if (!isPageActive()) return;
      noteBehaviourTick();
      runBehaviourTick();
    }, budget.behaviourMs);
    return () => window.clearInterval(id);
  }, [reducedMotion, budget.behaviourMs, runBehaviourTick]);

  useEffect(() => {
    if (reducedMotion) return;
    const id = window.setInterval(() => {
      if (!isPageActive()) return;
      tryRunSkit();
    }, budget.skitMs);
    return () => window.clearInterval(id);
  }, [reducedMotion, budget.skitMs]);

  return (
    <Canvas
      className="mascot-canvas"
      camera={{ position: [0, 0.55, 2.55], fov: 34 }}
      dpr={[1, budget.dprMax]}
      gl={budget.antialias ? CANVAS_GL.full : CANVAS_GL.lowPower}
      frameloop={reducedMotion ? "demand" : "always"}
      onPointerMissed={() => {}}
      aria-label="Lantern companion"
    >
      <SceneContent reducedMotion={reducedMotion} />
    </Canvas>
  );
}
