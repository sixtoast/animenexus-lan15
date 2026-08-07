"use client";

import { Canvas, ThreeEvent } from "@react-three/fiber";
import { ContactShadows, Environment } from "@react-three/drei";
import { PlaceholderChibi } from "./PlaceholderChibi";
import { HabitatPlatforms } from "./HabitatPlatforms";
import { useMascotStore } from "@/lib/mascot/store";
import { clampToHabitat } from "@/lib/mascot/navigation";
import { tryRunSkit } from "@/lib/mascot/run-skit";
import { useEffect } from "react";

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
        dispatch({ type: "go-to", x: t.x, z: t.z });
      }}
    >
      <planeGeometry args={[1.4, 0.8]} />
      <meshStandardMaterial
        color="#1a1512"
        transparent
        opacity={0.15}
        roughness={1}
      />
    </mesh>
  );
}

function SceneContent({ reducedMotion }: { reducedMotion?: boolean }) {
  return (
    <>
      <ambientLight intensity={0.55} />
      <directionalLight position={[2.5, 4, 3]} intensity={1.1} color="#fff5f0" />
      <pointLight position={[-2, 1, 2]} intensity={0.35} color="#f0a090" />
      <PlaceholderChibi />
      <Floor />
      <HabitatPlatforms />
      {!reducedMotion ? (
        <ContactShadows
          position={[0, -0.72, 0]}
          opacity={0.35}
          scale={4}
          blur={2.2}
          far={2}
        />
      ) : null}
      {!reducedMotion ? (
        <Environment preset="warehouse" environmentIntensity={0.25} />
      ) : null}
    </>
  );
}

export function MascotScene({ reducedMotion, lowPower }: Props) {
  const dispatch = useMascotStore((s) => s.dispatch);
  const runBehaviourTick = useMascotStore((s) => s.runBehaviourTick);

  useEffect(() => {
    if (reducedMotion) return;
    const id = window.setInterval(() => {
      runBehaviourTick();
    }, lowPower ? 4500 : 3200);
    return () => window.clearInterval(id);
  }, [reducedMotion, lowPower, runBehaviourTick]);

  useEffect(() => {
    if (reducedMotion) return;
    const id = window.setInterval(
      () => {
        tryRunSkit();
      },
      lowPower ? 22_000 : 16_000,
    );
    return () => window.clearInterval(id);
  }, [reducedMotion, lowPower]);

  return (
    <Canvas
      className="mascot-canvas"
      camera={{ position: [0, 0.55, 2.6], fov: 35 }}
      dpr={lowPower ? [1, 1] : [1, 1.5]}
      gl={{
        alpha: true,
        antialias: !lowPower,
        powerPreference: "low-power",
        failIfMajorPerformanceCaveat: false,
      }}
      frameloop={reducedMotion ? "demand" : "always"}
      onPointerMissed={() => {}}
      aria-label="Lantern companion"
    >
      <SceneContent reducedMotion={reducedMotion} />
    </Canvas>
  );
}
