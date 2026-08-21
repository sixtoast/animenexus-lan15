"use client";

import { Suspense, useMemo } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import type { ShelfObject } from "@/lib/living-shelf";
import { groupShelfByCluster } from "@/lib/living-shelf";
import { ShelfObjectMesh } from "./ShelfObjectMesh";

function ClusterObjects({
  objects,
  selectedId,
  onSelect,
}: {
  objects: ShelfObject[];
  selectedId: number | null;
  onSelect: (id: number) => void;
}) {
  const groups = useMemo(() => groupShelfByCluster(objects), [objects]);

  return (
    <>
      {(["watching", "planning", "paused", "completed", "dropped"] as const).map(
        (cluster) =>
          groups[cluster].map((o, i) => (
            <ShelfObjectMesh
              key={o.animeId}
              object={o}
              indexInCluster={i}
              selected={selectedId === o.animeId}
              onSelect={onSelect}
            />
          )),
      )}
    </>
  );
}

export function ShelfScene({
  objects,
  selectedId,
  onSelect,
  reducedMotion,
}: {
  objects: ShelfObject[];
  selectedId: number | null;
  onSelect: (id: number) => void;
  reducedMotion: boolean;
}) {
  return (
    <Canvas
      className="shelf-canvas"
      dpr={[1, 1.5]}
      camera={{ position: [0.2, 0.4, 5.2], fov: 42, near: 0.1, far: 40 }}
      gl={{ antialias: true, alpha: true, powerPreference: "default" }}
      onCreated={({ gl }) => {
        gl.setClearColor("#0c0a09", 0);
      }}
    >
      <ambientLight intensity={0.55} />
      <directionalLight position={[3, 4, 5]} intensity={0.85} />
      <pointLight position={[-2, 1, 3]} intensity={0.35} color="#f0a090" />

      <Suspense fallback={null}>
        <ClusterObjects
          objects={objects}
          selectedId={selectedId}
          onSelect={onSelect}
        />
      </Suspense>

      {/* Soft ground plane — archive, not furniture */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0.5, -1.6, -1]} receiveShadow>
        <circleGeometry args={[8, 48]} />
        <meshStandardMaterial
          color="#14100e"
          roughness={0.95}
          metalness={0}
          transparent
          opacity={0.55}
        />
      </mesh>

      <OrbitControls
        enablePan={false}
        enableDamping={!reducedMotion}
        dampingFactor={0.08}
        minDistance={3.2}
        maxDistance={9}
        minPolarAngle={Math.PI / 3.2}
        maxPolarAngle={Math.PI / 2.05}
        minAzimuthAngle={-0.85}
        maxAzimuthAngle={0.85}
        target={[0.4, 0.15, -0.8]}
      />
    </Canvas>
  );
}
