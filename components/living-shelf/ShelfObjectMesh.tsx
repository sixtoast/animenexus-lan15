"use client";

import { useMemo, useState } from "react";
import { useTexture } from "@react-three/drei";
import type { ThreeEvent } from "@react-three/fiber";
import type { ShelfObject } from "@/lib/living-shelf";
import * as THREE from "three";

/** Deterministic layout position from depth/seed/cluster. */
export function shelfPosition(o: ShelfObject, indexInCluster: number): [number, number, number] {
  const clusterX: Record<string, number> = {
    watching: -2.8,
    planning: -0.9,
    paused: 0.9,
    completed: 2.6,
    dropped: 4.2,
  };
  const baseX = clusterX[o.cluster] ?? 0;
  const col = indexInCluster % 3;
  const row = Math.floor(indexInCluster / 3);
  const x = baseX + (col - 1) * 0.55 + (o.seed - 0.5) * 0.12;
  const y = 0.9 - row * 0.95 + (o.seed - 0.5) * 0.08;
  const z = -o.depth * 3.2;
  return [x, y, z];
}

export function ShelfObjectMesh({
  object,
  indexInCluster,
  selected,
  onSelect,
}: {
  object: ShelfObject;
  indexInCluster: number;
  selected: boolean;
  onSelect: (id: number) => void;
}) {
  const [hovered, setHovered] = useState(false);
  const pos = useMemo(
    () => shelfPosition(object, indexInCluster),
    [object, indexInCluster],
  );

  const texture = useTexture(object.image || "/icon.svg");
  texture.colorSpace = THREE.SRGBColorSpace;

  const w = 0.42 * object.scale;
  const h = w * 1.5;
  const lift = selected ? 0.22 : hovered ? 0.1 : 0;

  return (
    <group
      position={[pos[0], pos[1] + lift, pos[2]]}
      onClick={(e: ThreeEvent<MouseEvent>) => {
        e.stopPropagation();
        onSelect(object.animeId);
      }}
      onPointerOver={(e) => {
        e.stopPropagation();
        setHovered(true);
        document.body.style.cursor = "pointer";
      }}
      onPointerOut={() => {
        setHovered(false);
        document.body.style.cursor = "auto";
      }}
    >
      <mesh>
        <planeGeometry args={[w, h]} />
        <meshStandardMaterial
          map={texture}
          roughness={0.55 + object.material.softness * 0.25}
          metalness={object.material.reflectivity * 0.2}
          emissive={selected ? new THREE.Color("#f0a090") : new THREE.Color("#000")}
          emissiveIntensity={selected ? 0.12 : 0}
        />
      </mesh>
      {/* Thin frame */}
      <mesh position={[0, 0, -0.01]}>
        <planeGeometry args={[w + 0.03, h + 0.03]} />
        <meshBasicMaterial color="#2a221c" />
      </mesh>
    </group>
  );
}
