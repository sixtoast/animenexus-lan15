"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { OrbitControls, Stars, Sparkles, Float } from "@react-three/drei";
import * as THREE from "three";
import {
  FIELD_STATUS_COLORS,
  fieldToWorld,
  type FieldNode,
} from "@/lib/archive-field";
import { onPageVisibility } from "@/lib/creative-visibility";

function useSafeTexture(url: string) {
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
  useEffect(() => () => map?.dispose(), [map]);
  return map;
}

function FieldCard3D({
  node,
  selected,
  compare,
  onSelect,
  reducedMotion,
}: {
  node: FieldNode;
  selected: boolean;
  compare: boolean;
  onSelect: (id: number) => void;
  reducedMotion: boolean;
}) {
  const group = useRef<THREE.Group>(null);
  const map = useSafeTexture(node.image);
  const glow = FIELD_STATUS_COLORS[node.status] || "#f0a090";
  const [pos] = useState(() => fieldToWorld(node));
  const scale = 0.35 + node.weight * 0.45;

  useFrame((state) => {
    if (!group.current || reducedMotion) return;
    const t = state.clock.elapsedTime;
    const floatY = Math.sin(t * 0.6 + node.seed * 6) * 0.04;
    group.current.position.y = pos[1] + (selected ? 0.2 : floatY);
    group.current.lookAt(state.camera.position);
  });

  const w = 0.55 * scale;
  const h = w * 1.45;

  return (
    <group
      ref={group}
      position={pos}
      onClick={(e) => {
        e.stopPropagation();
        onSelect(node.id);
      }}
      onPointerOver={() => {
        document.body.style.cursor = "pointer";
      }}
      onPointerOut={() => {
        document.body.style.cursor = "auto";
      }}
    >
      <mesh position={[0, 0, -0.03]}>
        <planeGeometry args={[w + 0.12, h + 0.12]} />
        <meshBasicMaterial
          color={glow}
          transparent
          opacity={selected ? 0.4 : compare ? 0.28 : 0.12}
          depthWrite={false}
        />
      </mesh>
      <mesh>
        <planeGeometry args={[w, h]} />
        {map ? (
          <meshStandardMaterial
            map={map}
            roughness={0.5}
            metalness={0.1}
            emissive={
              selected || compare
                ? new THREE.Color(glow)
                : new THREE.Color("#000")
            }
            emissiveIntensity={selected ? 0.2 : compare ? 0.1 : 0}
          />
        ) : (
          <meshStandardMaterial color="#2a221c" roughness={0.9} />
        )}
      </mesh>
      {(selected || compare) && (
        <mesh position={[0, 0, 0.02]}>
          <ringGeometry
            args={[Math.max(w, h) * 0.55, Math.max(w, h) * 0.62, 40]}
          />
          <meshBasicMaterial
            color={compare && !selected ? "#7eb8ff" : glow}
            transparent
            opacity={0.9}
            side={THREE.DoubleSide}
            depthWrite={false}
          />
        </mesh>
      )}
    </group>
  );
}

function FocusCamera({
  targetId,
  nodes,
}: {
  targetId: number | null;
  nodes: FieldNode[];
}) {
  const { camera } = useThree();
  const done = useRef<number | null>(null);

  useFrame(() => {
    if (targetId == null || targetId === done.current) return;
    const n = nodes.find((x) => x.id === targetId);
    if (!n) return;
    const [x, y, z] = fieldToWorld(n);
    const goal = new THREE.Vector3(x, y + 0.3, z + 3.2);
    camera.position.lerp(goal, 0.1);
    camera.lookAt(x, y, z);
    if (camera.position.distanceTo(goal) < 0.2) {
      done.current = targetId;
    }
  });

  useEffect(() => {
    done.current = null;
  }, [targetId]);

  return null;
}

export function FieldScene3D({
  nodes,
  selectedId,
  compareId,
  focusId,
  onSelect,
  reducedMotion,
}: {
  nodes: FieldNode[];
  selectedId: number | null;
  compareId: number | null;
  focusId: number | null;
  onSelect: (id: number) => void;
  reducedMotion: boolean;
}) {
  const [visible, setVisible] = useState(true);
  useEffect(() => onPageVisibility(setVisible), []);

  const frameloop =
    !visible || reducedMotion ? ("demand" as const) : ("always" as const);

  return (
    <Canvas
      className="archive-field-canvas"
      dpr={[1, 1.75]}
      frameloop={frameloop}
      camera={{ position: [0, 1.2, 9], fov: 42, near: 0.1, far: 80 }}
      gl={{
        antialias: true,
        alpha: true,
        powerPreference: "high-performance",
        toneMapping: THREE.ACESFilmicToneMapping,
        toneMappingExposure: 1.1,
      }}
      onCreated={({ gl }) => gl.setClearColor("#050408", 0)}
    >
      <color attach="background" args={["#07060a"]} />
      <fog attach="fog" args={["#07060a", 8, 28]} />
      <ambientLight intensity={0.4} />
      <directionalLight position={[5, 6, 4]} intensity={1} color="#fff5eb" />
      <pointLight position={[0, 2, 4]} intensity={0.5} color="#f0a090" />
      <pointLight position={[-3, 1, -2]} intensity={0.3} color="#7eb8ff" />

      <Stars
        radius={50}
        depth={40}
        count={reducedMotion ? 300 : 900}
        factor={3}
        fade
        speed={0.3}
      />
      {!reducedMotion && (
        <Sparkles
          count={40}
          scale={[14, 8, 12]}
          size={2}
          speed={0.3}
          opacity={0.45}
          color="#efc07a"
        />
      )}

      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -2.2, 0]}>
        <circleGeometry args={[12, 64]} />
        <meshStandardMaterial
          color="#0c0a10"
          transparent
          opacity={0.55}
          roughness={0.95}
        />
      </mesh>

      <Suspense fallback={null}>
        <Float
          speed={reducedMotion ? 0 : 0.4}
          floatIntensity={reducedMotion ? 0 : 0.1}
        >
          {nodes.map((n) => (
            <FieldCard3D
              key={n.id}
              node={n}
              selected={n.id === selectedId}
              compare={n.id === compareId}
              onSelect={onSelect}
              reducedMotion={reducedMotion}
            />
          ))}
        </Float>
      </Suspense>

      <FocusCamera targetId={focusId} nodes={nodes} />

      <OrbitControls
        enablePan
        enableDamping={!reducedMotion && visible}
        dampingFactor={0.08}
        minDistance={3}
        maxDistance={22}
        maxPolarAngle={Math.PI / 1.85}
      />
    </Canvas>
  );
}
