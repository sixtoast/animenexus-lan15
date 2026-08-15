"use client";

/**
 * GltfCompanion — load /public/mascot/companion.glb or fall back to LanternKoMesh.
 */

import * as THREE from "three";
import {
  Component,
  Suspense,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useFrame } from "@react-three/fiber";
import { useGLTF, useAnimations } from "@react-three/drei";
import {
  LanternKoMesh,
  EXPRESSIONS,
  type ExpressionKey,
} from "./LanternKoMeshV2";

const GLB_PATH = "/mascot/companion.glb";
const REQUIRED_NODES = ["Head", "Tip"] as const;
const OPTIONAL_NODES = [
  "Body",
  "ArmL",
  "ArmR",
  "BrowL",
  "BrowR",
  "Mouth",
  "EyeL",
  "EyeR",
] as const;

export type GltfCompanionProps = {
  expression: ExpressionKey;
  anim: string;
  justLanded?: boolean;
  yaw?: number;
  speed?: number;
};

function damp(current: number, target: number, lambda: number, dt: number) {
  return THREE.MathUtils.damp(current, target, lambda, dt);
}

function LoadedGlbCompanion({
  expression,
  anim,
  justLanded = false,
  yaw = 0,
  speed = 0,
}: GltfCompanionProps) {
  const gltf = useGLTF(GLB_PATH);
  const { actions, names } = useAnimations(gltf.animations, gltf.scene);

  const nodes = useMemo(() => {
    const found: Record<string, THREE.Object3D | undefined> = {};
    const wanted = new Set<string>([...REQUIRED_NODES, ...OPTIONAL_NODES]);
    gltf.scene.traverse((child) => {
      if (wanted.has(child.name)) found[child.name] = child;
    });
    return found;
  }, [gltf.scene]);

  const hasRequiredNodes = REQUIRED_NODES.every((n) => nodes[n]);
  const hasClips = names.length > 0;

  useEffect(() => {
    if (!hasClips) return;
    const clipName =
      names.find((n) => n.toLowerCase() === anim.toLowerCase()) ??
      names.find((n) => n.toLowerCase() === "idle") ??
      names[0];
    const action = clipName ? actions[clipName] : undefined;
    if (action) {
      action.reset().fadeIn(0.25).play();
      return () => {
        action.fadeOut(0.25);
      };
    }
  }, [anim, actions, names, hasClips]);

  const squashEnv = useRef(0);
  const tipLag = useRef(new THREE.Vector2(0, 0));

  useFrame((state, dtRaw) => {
    if (!hasRequiredNodes) return;
    const dt = Math.min(dtRaw, 0.05);
    const pose = EXPRESSIONS[expression] ?? EXPRESSIONS.neutral;
    const t = state.clock.elapsedTime;

    const browL = nodes.BrowL;
    const browR = nodes.BrowR;
    if (browL && browR) {
      browL.rotation.z = damp(browL.rotation.z, pose.brow[0], 8, dt);
      browR.rotation.z = damp(browR.rotation.z, pose.brow[1], 8, dt);
    }

    const eyeL = nodes.EyeL;
    const eyeR = nodes.EyeR;
    if (eyeL && eyeR) {
      eyeL.scale.y = damp(eyeL.scale.y, pose.eyeY, 12, dt);
      eyeR.scale.y = damp(eyeR.scale.y, pose.eyeY, 12, dt);
    }

    const mouth = nodes.Mouth as THREE.Mesh | undefined;
    if (mouth?.morphTargetDictionary && mouth.morphTargetInfluences) {
      const dict = mouth.morphTargetDictionary;
      for (const key of Object.keys(dict)) {
        const idx = dict[key];
        const target =
          key.toLowerCase() === pose.mouth.toLowerCase() ? 1 : 0;
        mouth.morphTargetInfluences[idx] = damp(
          mouth.morphTargetInfluences[idx],
          target,
          14,
          dt,
        );
      }
    }

    const tip = nodes.Tip as THREE.Mesh | undefined;
    if (tip) {
      const mat = tip.material as THREE.MeshStandardMaterial | undefined;
      if (mat && "emissiveIntensity" in mat) {
        mat.emissiveIntensity =
          0.55 + Math.sin(t * pose.pulse * Math.PI * 2) * 0.4;
      }
      const targetX = Math.sin(t * 2.2) * 0.05 * (0.4 + speed);
      const targetZ = -yaw * 0.15;
      tipLag.current.x = damp(tipLag.current.x, targetX, 5, dt);
      tipLag.current.y = damp(tipLag.current.y, targetZ, 4, dt);
      tip.rotation.x = tipLag.current.x;
      tip.rotation.z = tipLag.current.y;
    }

    const body = nodes.Body;
    if (body && !hasClips) {
      if (justLanded) squashEnv.current = 1;
      squashEnv.current = damp(squashEnv.current, 0, 6, dt);
      const sq = squashEnv.current;
      body.scale.set(1 + sq * 0.12, 1 - sq * 0.18, 1 + sq * 0.12);
    }
  });

  if (!hasRequiredNodes) {
    console.warn(
      `[GltfCompanion] ${GLB_PATH} missing required nodes (${REQUIRED_NODES.join(
        ", ",
      )}); using procedural mesh.`,
    );
    return (
      <LanternKoMesh
        expression={expression}
        justLanded={justLanded}
        yaw={yaw}
        speed={speed}
      />
    );
  }

  return <primitive object={gltf.scene} />;
}

class ErrorBoundaryToProcedural extends Component<
  { children: ReactNode; onError: () => void },
  { hasError: boolean }
> {
  constructor(props: { children: ReactNode; onError: () => void }) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  componentDidCatch() {
    this.props.onError();
  }
  render() {
    if (this.state.hasError) return null;
    return this.props.children;
  }
}

export function GltfCompanion(props: GltfCompanionProps) {
  const [loadFailed, setLoadFailed] = useState(false);

  if (loadFailed) {
    return (
      <LanternKoMesh
        expression={props.expression}
        justLanded={props.justLanded}
        yaw={props.yaw}
        speed={props.speed}
      />
    );
  }

  return (
    <ErrorBoundaryToProcedural onError={() => setLoadFailed(true)}>
      <Suspense
        fallback={
          <LanternKoMesh
            expression={props.expression}
            justLanded={props.justLanded}
            yaw={props.yaw}
            speed={props.speed}
          />
        }
      >
        <LoadedGlbCompanion {...props} />
      </Suspense>
    </ErrorBoundaryToProcedural>
  );
}

try {
  useGLTF.preload(GLB_PATH);
} catch {
  /* optional */
}
