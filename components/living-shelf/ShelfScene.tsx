"use client";

import {
  Suspense,
  useEffect,
  useMemo,
  useRef,
  useState,
  type RefObject,
} from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import {
  Float,
  Html,
  OrbitControls,
  Sparkles,
  Stars,
} from "@react-three/drei";
import {
  groupShelfByCluster,
  SHELF_CLUSTER_LABELS,
  type ShelfCluster,
  type ShelfObject,
} from "@/lib/living-shelf";
import { ShelfObjectMesh } from "./ShelfObjectMesh";
import { onPageVisibility } from "@/lib/creative-visibility";
import * as THREE from "three";

const CLUSTER_ORDER: ShelfCluster[] = [
  "watching",
  "planning",
  "paused",
  "completed",
  "dropped",
];

const CLUSTER_X: Record<ShelfCluster, number> = {
  watching: -3.4,
  planning: -1.2,
  paused: 1.0,
  completed: 3.1,
  dropped: 5.0,
};

const CLUSTER_COLOR: Record<ShelfCluster, string> = {
  watching: "#f0a090",
  planning: "#7eb8ff",
  paused: "#c9a227",
  completed: "#7dcea0",
  dropped: "#9a8b82",
};

function ClusterPlinth({
  cluster,
  count,
}: {
  cluster: ShelfCluster;
  count: number;
}) {
  if (count <= 0) return null;
  const x = CLUSTER_X[cluster];
  const color = CLUSTER_COLOR[cluster];
  return (
    <group position={[x, -1.55, -0.6]}>
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <circleGeometry args={[1.15, 48]} />
        <meshStandardMaterial
          color="#100e0c"
          roughness={0.9}
          metalness={0.15}
          transparent
          opacity={0.85}
        />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]}>
        <ringGeometry args={[0.95, 1.12, 64]} />
        <meshBasicMaterial
          color={color}
          transparent
          opacity={0.35}
          side={THREE.DoubleSide}
          depthWrite={false}
        />
      </mesh>
      <pointLight
        position={[0, 0.8, 0.4]}
        intensity={0.45}
        distance={4}
        color={color}
      />
      <Html
        position={[0, 0.15, 0.9]}
        center
        distanceFactor={8}
        style={{ pointerEvents: "none", userSelect: "none" }}
      >
        <div className="shelf-cluster-tag" data-cluster={cluster}>
          {SHELF_CLUSTER_LABELS[cluster]}
          <span>{count}</span>
        </div>
      </Html>
    </group>
  );
}

function DustField({ active }: { active: boolean }) {
  const ref = useRef<THREE.Points>(null);
  const geo = useMemo(() => {
    const n = 180;
    const positions = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      positions[i * 3] = (Math.random() - 0.4) * 12;
      positions[i * 3 + 1] = Math.random() * 5 - 1.5;
      positions[i * 3 + 2] = -Math.random() * 8;
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    return g;
  }, []);

  useFrame((_, dt) => {
    if (!ref.current || !active) return;
    ref.current.rotation.y += dt * 0.02;
  });

  return (
    <points ref={ref} geometry={geo}>
      <pointsMaterial
        size={0.035}
        color="#efc07a"
        transparent
        opacity={0.45}
        depthWrite={false}
        sizeAttenuation
      />
    </points>
  );
}

function ClusterObjects({
  objects,
  selectedId,
  compareId,
  onSelect,
  reducedMotion,
}: {
  objects: ShelfObject[];
  selectedId: number | null;
  compareId: number | null;
  onSelect: (id: number) => void;
  reducedMotion: boolean;
}) {
  const groups = useMemo(() => groupShelfByCluster(objects), [objects]);

  return (
    <>
      {CLUSTER_ORDER.map((cluster) => (
        <ClusterPlinth
          key={`plinth-${cluster}`}
          cluster={cluster}
          count={groups[cluster].length}
        />
      ))}
      {CLUSTER_ORDER.flatMap((cluster) =>
        groups[cluster].map((o, i) => (
          <ShelfObjectMesh
            key={o.animeId}
            object={o}
            indexInCluster={i}
            selected={selectedId === o.animeId}
            compare={compareId === o.animeId}
            onSelect={onSelect}
            reducedMotion={reducedMotion}
          />
        )),
      )}
    </>
  );
}

function AutoOrbit({
  controls,
  enabled,
}: {
  controls: RefObject<{ azimuthAngle: number; update: () => void } | null>;
  enabled: boolean;
}) {
  useFrame((_, dt) => {
    if (!enabled || !controls.current) return;
    controls.current.azimuthAngle += dt * 0.08;
    controls.current.update();
  });
  return null;
}

export function ShelfScene({
  objects,
  selectedId,
  compareId = null,
  onSelect,
  reducedMotion,
  dprMax = 1.5,
  antialias = true,
}: {
  objects: ShelfObject[];
  selectedId: number | null;
  compareId?: number | null;
  onSelect: (id: number) => void;
  reducedMotion: boolean;
  dprMax?: number;
  antialias?: boolean;
}) {
  const [pageVisible, setPageVisible] = useState(true);
  const [autoOrbit, setAutoOrbit] = useState(!reducedMotion);
  const controlsRef = useRef<{
    azimuthAngle: number;
    update: () => void;
  } | null>(null);

  useEffect(() => {
    return onPageVisibility(setPageVisible);
  }, []);

  useEffect(() => {
    if (selectedId != null) setAutoOrbit(false);
  }, [selectedId]);

  const frameloop =
    !pageVisible || reducedMotion ? ("demand" as const) : ("always" as const);

  return (
    <Canvas
      className="shelf-canvas"
      dpr={[1, dprMax]}
      frameloop={frameloop}
      camera={{ position: [0.6, 1.1, 6.2], fov: 40, near: 0.1, far: 60 }}
      gl={{
        antialias,
        alpha: true,
        powerPreference: "high-performance",
        toneMapping: THREE.ACESFilmicToneMapping,
        toneMappingExposure: 1.15,
      }}
      onCreated={({ gl }) => {
        gl.setClearColor("#050408", 0);
      }}
      onPointerDown={() => setAutoOrbit(false)}
    >
      <color attach="background" args={["#07060a"]} />
      <fog attach="fog" args={["#07060a", 6, 18]} />

      <ambientLight intensity={0.35} />
      <directionalLight position={[4, 6, 5]} intensity={1.05} color="#fff5eb" />
      <directionalLight position={[-5, 2, -2]} intensity={0.35} color="#7eb8ff" />
      <pointLight position={[0, 2.5, 3]} intensity={0.55} color="#f0a090" />
      <pointLight position={[3, 0.5, -2]} intensity={0.3} color="#efc07a" />

      <Stars
        radius={40}
        depth={30}
        count={reducedMotion ? 400 : 1200}
        factor={3}
        saturation={0.4}
        fade
        speed={reducedMotion ? 0 : 0.4}
      />

      {!reducedMotion && (
        <Sparkles
          count={60}
          scale={[12, 6, 8]}
          size={2.5}
          speed={0.35}
          opacity={0.55}
          color="#efc07a"
        />
      )}

      <DustField active={!reducedMotion && pageVisible} />

      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0.6, -1.62, -1]}
        receiveShadow
      >
        <circleGeometry args={[9, 64]} />
        <meshStandardMaterial
          color="#0c0a10"
          roughness={0.92}
          metalness={0.08}
          transparent
          opacity={0.7}
        />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0.6, -1.6, -1]}>
        <ringGeometry args={[7.2, 8.4, 64]} />
        <meshBasicMaterial
          color="#f0a090"
          transparent
          opacity={0.08}
          side={THREE.DoubleSide}
          depthWrite={false}
        />
      </mesh>

      <Suspense fallback={null}>
        <Float
          speed={reducedMotion ? 0 : 0.6}
          rotationIntensity={0}
          floatIntensity={reducedMotion ? 0 : 0.15}
        >
          <ClusterObjects
            objects={objects}
            selectedId={selectedId}
            compareId={compareId}
            onSelect={onSelect}
            reducedMotion={reducedMotion}
          />
        </Float>
      </Suspense>

      <OrbitControls
        ref={controlsRef as never}
        enablePan={false}
        enableDamping={!reducedMotion && pageVisible}
        dampingFactor={0.07}
        minDistance={3.4}
        maxDistance={11}
        minPolarAngle={Math.PI / 3.4}
        maxPolarAngle={Math.PI / 2.02}
        minAzimuthAngle={-1.05}
        maxAzimuthAngle={1.05}
        target={[0.5, 0.25, -0.9]}
      />

      <AutoOrbit
        controls={controlsRef}
        enabled={
          autoOrbit && pageVisible && !reducedMotion && selectedId == null
        }
      />
    </Canvas>
  );
}
