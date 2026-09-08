"use client";

import {
  Suspense,
  useEffect,
  useMemo,
  useRef,
  useState,
  type RefObject,
} from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { OrbitControls, Stars, Sparkles, Float } from "@react-three/drei";
import * as THREE from "three";
import {
  FIELD_STATUS_COLORS,
  fieldToWorld,
  type FieldNode,
} from "@/lib/archive-field";
import { onPageVisibility } from "@/lib/creative-visibility";

type OrbitControlsHandle = {
  enabled: boolean;
  target: THREE.Vector3;
  object: THREE.Object3D;
  update: () => void;
};

function useSafeTexture(url: string) {
  const [map, setMap] = useState<THREE.Texture | null>(null);

  useEffect(() => {
    if (!url || !url.trim()) {
      setMap(null);
      return;
    }

    let cancelled = false;
    let tex: THREE.Texture | null = null;

    const apply = (img: HTMLImageElement) => {
      if (cancelled) return;
      tex = new THREE.Texture(img);
      tex.colorSpace = THREE.SRGBColorSpace;
      tex.minFilter = THREE.LinearFilter;
      tex.magFilter = THREE.LinearFilter;
      tex.generateMipmaps = false;
      tex.needsUpdate = true;
      setMap(tex);
    };

    const load = (crossOrigin: string | null) => {
      const img = new Image();
      if (crossOrigin) img.crossOrigin = crossOrigin;
      img.onload = () => apply(img);
      img.onerror = () => {
        if (crossOrigin === "anonymous") {
          load(null);
        } else if (!cancelled) {
          setMap(null);
        }
      };
      img.src = url;
    };

    load("anonymous");

    return () => {
      cancelled = true;
      if (tex) tex.dispose();
    };
  }, [url]);

  return map;
}

function FieldCard3D({
  node,
  selected,
  compare,
  onSelect,
  reducedMotion,
  layoutKey,
}: {
  node: FieldNode;
  selected: boolean;
  compare: boolean;
  onSelect: (id: number) => void;
  reducedMotion: boolean;
  layoutKey: string;
}) {
  const group = useRef<THREE.Group>(null);
  const map = useSafeTexture(node.image);
  const glow = FIELD_STATUS_COLORS[node.status] || "#f0a090";

  const basePos = useMemo(
    () => fieldToWorld(node),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [node.x, node.y, node.z, layoutKey],
  );

  const scale = 0.35 + node.weight * 0.45;
  const w = 0.55 * scale;
  const h = w * 1.45;

  useFrame((state) => {
    if (!group.current) return;
    const t = state.clock.elapsedTime;
    const floatY =
      reducedMotion || selected
        ? 0
        : Math.sin(t * 0.6 + node.seed * 6) * 0.04;
    const lift = selected ? 0.22 : floatY;
    group.current.position.set(basePos[0], basePos[1] + lift, basePos[2]);
    group.current.quaternion.copy(state.camera.quaternion);
  });

  return (
    <group
      ref={group}
      position={basePos}
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
          opacity={selected ? 0.45 : compare ? 0.3 : 0.14}
          depthWrite={false}
        />
      </mesh>
      <mesh>
        <planeGeometry args={[w, h]} />
        {map ? (
          <meshBasicMaterial map={map} toneMapped={false} />
        ) : (
          <meshBasicMaterial color="#3a322c" />
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
  controlsRef,
}: {
  targetId: number | null;
  nodes: FieldNode[];
  controlsRef: RefObject<OrbitControlsHandle | null>;
}) {
  const { camera } = useThree();
  const animating = useRef(false);
  const lastTarget = useRef<number | null>(null);

  useEffect(() => {
    if (targetId == null) {
      animating.current = false;
      lastTarget.current = null;
      return;
    }
    if (targetId !== lastTarget.current) {
      animating.current = true;
      lastTarget.current = targetId;
      if (controlsRef.current) controlsRef.current.enabled = false;
    }
  }, [targetId, controlsRef]);

  useFrame(() => {
    if (!animating.current || targetId == null) return;
    const n = nodes.find((x) => x.id === targetId);
    if (!n) {
      animating.current = false;
      if (controlsRef.current) controlsRef.current.enabled = true;
      return;
    }
    const [x, y, z] = fieldToWorld(n);
    const look = new THREE.Vector3(x, y, z);
    const goal = new THREE.Vector3(x, y + 0.35, z + 3.6);

    camera.position.lerp(goal, 0.14);
    const ctrl = controlsRef.current;
    if (ctrl) {
      ctrl.target.lerp(look, 0.14);
      ctrl.update();
    } else {
      camera.lookAt(look);
    }

    if (camera.position.distanceTo(goal) < 0.12) {
      camera.position.copy(goal);
      if (ctrl) {
        ctrl.target.copy(look);
        ctrl.update();
        ctrl.enabled = true;
      }
      animating.current = false;
    }
  });

  return null;
}

export function FieldScene3D({
  nodes,
  selectedId,
  compareId,
  focusId,
  onSelect,
  reducedMotion,
  layoutKey = "orbit",
}: {
  nodes: FieldNode[];
  selectedId: number | null;
  compareId: number | null;
  focusId: number | null;
  onSelect: (id: number) => void;
  reducedMotion: boolean;
  layoutKey?: string;
}) {
  const [visible, setVisible] = useState(true);
  const controlsRef = useRef<OrbitControlsHandle | null>(null);

  useEffect(() => onPageVisibility(setVisible), []);

  useEffect(() => {
    const ctrl = controlsRef.current;
    if (!ctrl) return;
    ctrl.target.set(0, 0.2, 0);
    ctrl.object.position.set(0, 1.4, 10);
    ctrl.update();
  }, [layoutKey]);

  const frameloop =
    !visible || reducedMotion ? ("demand" as const) : ("always" as const);

  return (
    <Canvas
      className="archive-field-canvas"
      dpr={[1, 1.75]}
      frameloop={frameloop}
      camera={{ position: [0, 1.4, 10], fov: 42, near: 0.1, far: 80 }}
      gl={{
        antialias: true,
        alpha: true,
        powerPreference: "high-performance",
        toneMapping: THREE.ACESFilmicToneMapping,
        toneMappingExposure: 1.05,
      }}
      onCreated={({ gl }) => {
        gl.setClearColor("#050408", 0);
        gl.outputColorSpace = THREE.SRGBColorSpace;
      }}
    >
      <color attach="background" args={["#07060a"]} />
      <fog attach="fog" args={["#07060a", 10, 32]} />
      <ambientLight intensity={0.85} />
      <directionalLight position={[5, 6, 4]} intensity={0.9} color="#fff5eb" />
      <pointLight position={[0, 2, 4]} intensity={0.35} color="#f0a090" />

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
          count={36}
          scale={[14, 8, 12]}
          size={2}
          speed={0.3}
          opacity={0.4}
          color="#efc07a"
        />
      )}

      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -2.4, 0]}>
        <circleGeometry args={[14, 64]} />
        <meshStandardMaterial
          color="#0c0a10"
          transparent
          opacity={0.5}
          roughness={0.95}
        />
      </mesh>

      <Suspense fallback={null}>
        <Float
          speed={reducedMotion ? 0 : 0.35}
          floatIntensity={reducedMotion ? 0 : 0.08}
        >
          {nodes.map((n) => (
            <FieldCard3D
              key={`${layoutKey}-${n.id}`}
              layoutKey={layoutKey}
              node={n}
              selected={n.id === selectedId}
              compare={n.id === compareId}
              onSelect={onSelect}
              reducedMotion={reducedMotion}
            />
          ))}
        </Float>
      </Suspense>

      <FocusCamera
        targetId={focusId}
        nodes={nodes}
        controlsRef={controlsRef}
      />

      <OrbitControls
        ref={controlsRef as never}
        enablePan
        enableDamping={!reducedMotion && visible}
        dampingFactor={0.08}
        minDistance={2.5}
        maxDistance={24}
        maxPolarAngle={Math.PI / 1.85}
      />
    </Canvas>
  );
}
