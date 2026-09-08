"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import type { ThreeEvent } from "@react-three/fiber";
import type { ShelfObject } from "@/lib/living-shelf";
import * as THREE from "three";

const CLUSTER_GLOW: Record<string, string> = {
  watching: "#f0a090",
  planning: "#7eb8ff",
  paused: "#c9a227",
  completed: "#7dcea0",
  dropped: "#9a8b82",
};

/** Deterministic layout — arc per cluster so the shelf feels like a gallery. */
export function shelfPosition(
  o: ShelfObject,
  indexInCluster: number,
): [number, number, number] {
  const clusterX: Record<string, number> = {
    watching: -3.4,
    planning: -1.2,
    paused: 1.0,
    completed: 3.1,
    dropped: 5.0,
  };
  const baseX = clusterX[o.cluster] ?? 0;
  const col = indexInCluster % 3;
  const row = Math.floor(indexInCluster / 3);
  const x = baseX + (col - 1) * 0.62 + (o.seed - 0.5) * 0.14;
  const y = 1.05 - row * 1.05 + (o.seed - 0.5) * 0.1;
  const z = -o.depth * 3.6 + Math.sin(indexInCluster * 0.7 + o.seed) * 0.15;
  return [x, y, z];
}

function useSafeTexture(url: string | undefined) {
  const [map, setMap] = useState<THREE.Texture | null>(null);

  useEffect(() => {
    if (!url) {
      setMap(null);
      return;
    }
    let cancelled = false;
    const loader = new THREE.TextureLoader();
    loader.setCrossOrigin("anonymous");
    loader.load(
      url,
      (tex) => {
        if (cancelled) {
          tex.dispose();
          return;
        }
        tex.colorSpace = THREE.SRGBColorSpace;
        tex.anisotropy = 4;
        setMap(tex);
      },
      undefined,
      () => {
        if (!cancelled) setMap(null);
      },
    );
    return () => {
      cancelled = true;
    };
  }, [url]);

  useEffect(() => {
    return () => {
      map?.dispose();
    };
  }, [map]);

  return map;
}

export function ShelfObjectMesh({
  object,
  indexInCluster,
  selected,
  compare,
  onSelect,
  reducedMotion,
}: {
  object: ShelfObject;
  indexInCluster: number;
  selected: boolean;
  compare?: boolean;
  onSelect: (id: number) => void;
  reducedMotion?: boolean;
}) {
  const group = useRef<THREE.Group>(null);
  const [hovered, setHovered] = useState(false);
  const pos = useMemo(
    () => shelfPosition(object, indexInCluster),
    [object, indexInCluster],
  );
  const map = useSafeTexture(object.image);
  const glow = CLUSTER_GLOW[object.cluster] || "#f0a090";

  const w = 0.48 * object.scale;
  const h = w * 1.48;
  const phase = object.seed * Math.PI * 2;

  useFrame((state) => {
    if (!group.current || reducedMotion) return;
    const t = state.clock.elapsedTime;
    const floatY = Math.sin(t * 0.7 + phase) * 0.04;
    const targetLift = selected ? 0.28 : hovered ? 0.14 : floatY;
    group.current.position.y = THREE.MathUtils.lerp(
      group.current.position.y,
      pos[1] + targetLift,
      0.12,
    );
    const targetScale = selected ? 1.08 : hovered ? 1.04 : 1;
    const s = group.current.scale.x;
    const next = THREE.MathUtils.lerp(s, targetScale, 0.15);
    group.current.scale.setScalar(next);
    if (selected) {
      group.current.rotation.y = THREE.MathUtils.lerp(
        group.current.rotation.y,
        Math.sin(t * 0.5) * 0.08,
        0.08,
      );
    } else {
      group.current.rotation.y = THREE.MathUtils.lerp(
        group.current.rotation.y,
        0,
        0.08,
      );
    }
  });

  return (
    <group
      ref={group}
      position={[pos[0], pos[1], pos[2]]}
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
      <mesh position={[0, 0, -0.04]}>
        <planeGeometry args={[w + 0.18, h + 0.18]} />
        <meshBasicMaterial
          color={glow}
          transparent
          opacity={selected ? 0.35 : hovered ? 0.22 : 0.1}
          depthWrite={false}
        />
      </mesh>

      <mesh position={[0, 0, -0.015]}>
        <planeGeometry args={[w + 0.04, h + 0.04]} />
        <meshBasicMaterial color="#1a1410" />
      </mesh>

      <mesh>
        <planeGeometry args={[w, h]} />
        {map ? (
          <meshStandardMaterial
            map={map}
            roughness={0.45 + object.material.softness * 0.3}
            metalness={object.material.reflectivity * 0.25}
            emissive={
              selected || compare
                ? new THREE.Color(glow)
                : new THREE.Color("#000")
            }
            emissiveIntensity={selected ? 0.18 : compare ? 0.1 : 0}
          />
        ) : (
          <meshStandardMaterial
            color="#2a221c"
            roughness={0.85}
            metalness={0.05}
          />
        )}
      </mesh>

      {(selected || compare) && (
        <mesh position={[0, 0, 0.02]}>
          <ringGeometry
            args={[Math.max(w, h) * 0.55, Math.max(w, h) * 0.62, 48]}
          />
          <meshBasicMaterial
            color={compare && !selected ? "#7eb8ff" : glow}
            transparent
            opacity={0.85}
            side={THREE.DoubleSide}
            depthWrite={false}
          />
        </mesh>
      )}

      {object.progressRatio > 0.02 && (
        <mesh position={[0, -h / 2 - 0.06, 0.01]}>
          <planeGeometry args={[w * object.progressRatio, 0.025]} />
          <meshBasicMaterial color={glow} transparent opacity={0.9} />
        </mesh>
      )}
    </group>
  );
}
