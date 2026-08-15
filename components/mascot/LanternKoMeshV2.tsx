"use client";

/**
 * Procedural Lantern-ko mesh — proportions & secondary motion from Claude
 * live demo, expression keys aligned with lib/mascot/expression.ts.
 */

import * as THREE from "three";
import { forwardRef, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";

export type ExpressionKey =
  | "neutral"
  | "happy"
  | "excited"
  | "curious"
  | "confused"
  | "surprised"
  | "embarrassed"
  | "sad"
  | "sleepy"
  | "scared"
  | "annoyed"
  | "proud"
  | "mischievous"
  | "focused"
  | "smug";

export type MouthVariant =
  | "smile"
  | "bigSmile"
  | "frown"
  | "openO"
  | "flat"
  | "wobble";

export type MeshExpressionPose = {
  brow: [number, number];
  browY: number;
  eyeY: number;
  mouth: MouthVariant;
  cheek: number;
  pulse: number;
};

/** Shared with GltfCompanion so GLB path can reuse the same table. */
export const EXPRESSIONS: Record<ExpressionKey, MeshExpressionPose> = {
  neutral: {
    brow: [0.05, -0.05],
    browY: 0,
    eyeY: 1,
    mouth: "flat",
    cheek: 0.15,
    pulse: 0.4,
  },
  happy: {
    brow: [0.15, -0.15],
    browY: 0.01,
    eyeY: 0.85,
    mouth: "smile",
    cheek: 0.4,
    pulse: 0.6,
  },
  excited: {
    brow: [0.3, -0.3],
    browY: 0.03,
    eyeY: 1.15,
    mouth: "bigSmile",
    cheek: 0.5,
    pulse: 1.5,
  },
  curious: {
    brow: [0.3, -0.05],
    browY: 0.02,
    eyeY: 1,
    mouth: "openO",
    cheek: 0.2,
    pulse: 0.7,
  },
  confused: {
    brow: [0.25, -0.2],
    browY: 0.01,
    eyeY: 0.85,
    mouth: "wobble",
    cheek: 0.1,
    pulse: 0.45,
  },
  surprised: {
    brow: [-0.35, 0.35],
    browY: 0.04,
    eyeY: 1.35,
    mouth: "openO",
    cheek: 0.15,
    pulse: 1.3,
  },
  embarrassed: {
    brow: [0.08, -0.08],
    browY: -0.01,
    eyeY: 0.7,
    mouth: "flat",
    cheek: 0.85,
    pulse: 0.55,
  },
  sad: {
    brow: [-0.28, 0.28],
    browY: -0.015,
    eyeY: 0.65,
    mouth: "frown",
    cheek: 0.05,
    pulse: 0.25,
  },
  sleepy: {
    brow: [0.08, -0.08],
    browY: -0.02,
    eyeY: 0.12,
    mouth: "flat",
    cheek: 0.08,
    pulse: 0.15,
  },
  scared: {
    brow: [-0.35, 0.35],
    browY: 0.03,
    eyeY: 1.25,
    mouth: "openO",
    cheek: 0.08,
    pulse: 1.4,
  },
  annoyed: {
    brow: [-0.22, 0.22],
    browY: -0.01,
    eyeY: 0.75,
    mouth: "frown",
    cheek: 0.12,
    pulse: 0.35,
  },
  proud: {
    brow: [0.12, -0.12],
    browY: 0.015,
    eyeY: 0.95,
    mouth: "smile",
    cheek: 0.35,
    pulse: 0.7,
  },
  mischievous: {
    brow: [0.28, -0.08],
    browY: 0.02,
    eyeY: 0.8,
    mouth: "smile",
    cheek: 0.28,
    pulse: 0.9,
  },
  focused: {
    brow: [-0.1, 0.1],
    browY: 0.01,
    eyeY: 0.9,
    mouth: "flat",
    cheek: 0.1,
    pulse: 0.5,
  },
  smug: {
    brow: [0.22, -0.05],
    browY: 0.01,
    eyeY: 0.7,
    mouth: "smile",
    cheek: 0.3,
    pulse: 0.65,
  },
};

// Legacy alias fields used by older GltfCompanion pose readers
export type LegacyPose = MeshExpressionPose & {
  browRotZ: [number, number];
  eyeScaleY: number;
  tipPulseHz: number;
  cheekOpacity: number;
  headTilt: number;
};

export function toLegacyPose(p: MeshExpressionPose): LegacyPose {
  return {
    ...p,
    browRotZ: p.brow,
    eyeScaleY: p.eyeY,
    tipPulseHz: p.pulse,
    cheekOpacity: p.cheek,
    headTilt: 0,
  };
}

const HEAD_R = 0.42;
const BODY_R = HEAD_R * 0.52;
const BODY_LEN = HEAD_R * 0.55;
const ARM_R = HEAD_R * 0.17;
const ARM_LEN = HEAD_R * 0.55;
const TIP_R = HEAD_R * 0.16;
const STEM_LEN = HEAD_R * 0.38;

const PALETTE = {
  skin: "#f0a898",
  blush: "#f0a090",
  eye: "#2a1810",
  eyeHighlight: "#ffffff",
  mouth: "#c4786a",
  tip: "#ffd9a8",
  brow: "#2a1810",
};

export type LanternKoMeshProps = {
  expression?: ExpressionKey;
  yaw?: number;
  speed?: number;
  justLanded?: boolean;
};

function damp(current: number, target: number, lambda: number, dt: number) {
  return THREE.MathUtils.damp(current, target, lambda, dt);
}

export const LanternKoMesh = forwardRef<THREE.Group, LanternKoMeshProps>(
  function LanternKoMesh(
    { expression = "neutral", yaw = 0, speed = 0, justLanded = false },
    ref,
  ) {
    const root = useRef<THREE.Group>(null);
    const bodyGroup = useRef<THREE.Group>(null);
    const armL = useRef<THREE.Group>(null);
    const armR = useRef<THREE.Group>(null);
    const head = useRef<THREE.Group>(null);
    const tipGroup = useRef<THREE.Group>(null);
    const tip = useRef<THREE.Mesh>(null);
    const glow = useRef<THREE.Mesh>(null);
    const eyeL = useRef<THREE.Mesh>(null);
    const eyeR = useRef<THREE.Mesh>(null);
    const browL = useRef<THREE.Mesh>(null);
    const browR = useRef<THREE.Mesh>(null);
    const cheekL = useRef<THREE.Mesh>(null);
    const cheekR = useRef<THREE.Mesh>(null);
    const mouthRefs = useRef<Record<MouthVariant, THREE.Mesh | null>>({
      smile: null,
      bigSmile: null,
      frown: null,
      openO: null,
      flat: null,
      wobble: null,
    });

    const squashEnv = useRef(0);
    const settlePhase = useRef(0);
    const tipLag = useRef(new THREE.Vector2(0, 0));
    const browBaseY = HEAD_R * 0.22;

    const materials = useMemo(() => {
      const skin = new THREE.MeshStandardMaterial({
        color: PALETTE.skin,
        roughness: 0.45,
        metalness: 0.05,
      });
      const blush = new THREE.MeshStandardMaterial({
        color: PALETTE.blush,
        roughness: 0.5,
        transparent: true,
        opacity: 0.2,
        depthWrite: false,
      });
      const eye = new THREE.MeshStandardMaterial({
        color: PALETTE.eye,
        roughness: 0.3,
      });
      const mouth = new THREE.MeshStandardMaterial({
        color: PALETTE.mouth,
        roughness: 0.4,
      });
      const brow = new THREE.MeshStandardMaterial({
        color: PALETTE.brow,
        roughness: 0.6,
      });
      const tipMat = new THREE.MeshStandardMaterial({
        color: PALETTE.tip,
        emissive: PALETTE.tip,
        emissiveIntensity: 0.6,
        roughness: 0.3,
      });
      const glowMat = new THREE.MeshBasicMaterial({
        color: PALETTE.tip,
        transparent: true,
        opacity: 0.22,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      });
      const hl = new THREE.MeshBasicMaterial({ color: PALETTE.eyeHighlight });
      return { skin, blush, eye, mouth, brow, tipMat, glowMat, hl };
    }, []);

    useFrame((state, delta) => {
      const dt = Math.min(delta, 0.05);
      const t = state.clock.elapsedTime;
      const pose = EXPRESSIONS[expression] ?? EXPRESSIONS.neutral;

      if (eyeL.current && eyeR.current) {
        eyeL.current.scale.y = damp(eyeL.current.scale.y, pose.eyeY, 12, dt);
        eyeR.current.scale.y = damp(eyeR.current.scale.y, pose.eyeY, 12, dt);
      }

      if (browL.current && browR.current) {
        browL.current.rotation.z = damp(
          browL.current.rotation.z,
          pose.brow[0],
          8,
          dt,
        );
        browR.current.rotation.z = damp(
          browR.current.rotation.z,
          pose.brow[1],
          8,
          dt,
        );
        browL.current.position.y = damp(
          browL.current.position.y,
          browBaseY + pose.browY,
          8,
          dt,
        );
        browR.current.position.y = damp(
          browR.current.position.y,
          browBaseY + pose.browY,
          8,
          dt,
        );
      }

      (Object.keys(mouthRefs.current) as MouthVariant[]).forEach((key) => {
        const m = mouthRefs.current[key];
        if (!m) return;
        const active = key === pose.mouth;
        const target = active ? 1 : 0;
        const scale = damp(m.scale.x || 0.0001, target, 14, dt);
        const s = Math.max(scale, 0.0001);
        m.scale.setScalar(s);
        m.visible = s > 0.02;
      });

      if (cheekL.current && cheekR.current) {
        const matL = cheekL.current.material as THREE.MeshStandardMaterial;
        const matR = cheekR.current.material as THREE.MeshStandardMaterial;
        matL.opacity = damp(matL.opacity, pose.cheek, 6, dt);
        matR.opacity = damp(matR.opacity, pose.cheek, 6, dt);
      }

      if (tip.current) {
        const mat = tip.current.material as THREE.MeshStandardMaterial;
        const pulse = 0.55 + Math.sin(t * pose.pulse * Math.PI * 2) * 0.4;
        mat.emissiveIntensity = pulse;
        if (glow.current) {
          const gMat = glow.current.material as THREE.MeshBasicMaterial;
          gMat.opacity = 0.12 + pulse * 0.14;
        }
      }

      if (tipGroup.current) {
        const targetX = Math.sin(t * 2.2) * 0.05 * (0.4 + speed);
        const targetZ = -yaw * 0.15;
        tipLag.current.x = damp(tipLag.current.x, targetX, 5, dt);
        tipLag.current.y = damp(tipLag.current.y, targetZ, 4, dt);
        tipGroup.current.rotation.x = tipLag.current.x;
        tipGroup.current.rotation.z = tipLag.current.y;
      }

      if (justLanded) squashEnv.current = 1;
      squashEnv.current = damp(squashEnv.current, 0, 6, dt);
      const sq = squashEnv.current;
      if (bodyGroup.current) {
        bodyGroup.current.scale.set(1 + sq * 0.12, 1 - sq * 0.18, 1 + sq * 0.12);
      }
      settlePhase.current += dt * 9;
      const wobble = Math.sin(settlePhase.current) * sq * 0.25;
      if (armL.current) armL.current.rotation.x = wobble;
      if (armR.current) armR.current.rotation.x = -wobble;

      if (root.current) {
        root.current.position.y = Math.sin(t * 1.4) * 0.015 * (0.5 + speed);
      }
    });

    const setRoot = (node: THREE.Group | null) => {
      root.current = node;
      if (typeof ref === "function") ref(node);
      else if (ref) ref.current = node;
    };

    return (
      <group ref={setRoot}>
        <group ref={bodyGroup} name="Body" position={[0, -HEAD_R * 0.7, 0]}>
          <mesh castShadow>
            <capsuleGeometry args={[BODY_R, BODY_LEN, 10, 12]} />
            <primitive object={materials.skin} attach="material" />
          </mesh>

          <group
            ref={armL}
            name="ArmL"
            position={[-BODY_R - ARM_R * 0.55, BODY_LEN * 0.15, 0]}
            rotation={[0, 0, 0.35]}
          >
            <mesh>
              <capsuleGeometry args={[ARM_R, ARM_LEN, 6, 8]} />
              <primitive object={materials.skin} attach="material" />
            </mesh>
          </group>
          <group
            ref={armR}
            name="ArmR"
            position={[BODY_R + ARM_R * 0.55, BODY_LEN * 0.15, 0]}
            rotation={[0, 0, -0.35]}
          >
            <mesh>
              <capsuleGeometry args={[ARM_R, ARM_LEN, 6, 8]} />
              <primitive object={materials.skin} attach="material" />
            </mesh>
          </group>
        </group>

        <group ref={head} name="Head" position={[0, HEAD_R * 0.55, 0]}>
          <mesh castShadow>
            <sphereGeometry args={[HEAD_R, 28, 24]} />
            <primitive object={materials.skin} attach="material" />
          </mesh>

          <mesh
            ref={cheekL}
            position={[-HEAD_R * 0.52, -HEAD_R * 0.08, HEAD_R * 0.78]}
          >
            <sphereGeometry args={[HEAD_R * 0.2, 12, 12]} />
            <primitive object={materials.blush} attach="material" />
          </mesh>
          <mesh
            ref={cheekR}
            position={[HEAD_R * 0.52, -HEAD_R * 0.08, HEAD_R * 0.78]}
          >
            <sphereGeometry args={[HEAD_R * 0.2, 12, 12]} />
            <meshStandardMaterial
              color={PALETTE.blush}
              roughness={0.5}
              transparent
              opacity={0.2}
              depthWrite={false}
            />
          </mesh>

          <mesh
            ref={eyeL}
            name="EyeL"
            position={[-HEAD_R * 0.32, HEAD_R * 0.02, HEAD_R * 0.9]}
          >
            <sphereGeometry args={[HEAD_R * 0.12, 14, 14]} />
            <primitive object={materials.eye} attach="material" />
          </mesh>
          <mesh
            ref={eyeR}
            name="EyeR"
            position={[HEAD_R * 0.32, HEAD_R * 0.02, HEAD_R * 0.9]}
          >
            <sphereGeometry args={[HEAD_R * 0.12, 14, 14]} />
            <primitive object={materials.eye} attach="material" />
          </mesh>

          <mesh position={[-HEAD_R * 0.28, HEAD_R * 0.06, HEAD_R * 0.98]}>
            <sphereGeometry args={[HEAD_R * 0.035, 8, 8]} />
            <primitive object={materials.hl} attach="material" />
          </mesh>
          <mesh position={[HEAD_R * 0.36, HEAD_R * 0.06, HEAD_R * 0.98]}>
            <sphereGeometry args={[HEAD_R * 0.035, 8, 8]} />
            <primitive object={materials.hl} attach="material" />
          </mesh>

          <mesh
            ref={browL}
            name="BrowL"
            position={[-HEAD_R * 0.32, browBaseY, HEAD_R * 0.85]}
          >
            <boxGeometry args={[HEAD_R * 0.26, HEAD_R * 0.04, HEAD_R * 0.05]} />
            <primitive object={materials.brow} attach="material" />
          </mesh>
          <mesh
            ref={browR}
            name="BrowR"
            position={[HEAD_R * 0.32, browBaseY, HEAD_R * 0.85]}
          >
            <boxGeometry args={[HEAD_R * 0.26, HEAD_R * 0.04, HEAD_R * 0.05]} />
            <primitive object={materials.brow} attach="material" />
          </mesh>

          <group name="Mouth" position={[0, -HEAD_R * 0.28, HEAD_R * 0.92]}>
            <mesh
              ref={(m) => {
                mouthRefs.current.smile = m;
              }}
              rotation={[0, 0, Math.PI]}
              scale={0.0001}
              visible={false}
            >
              <torusGeometry args={[HEAD_R * 0.15, HEAD_R * 0.028, 8, 16, Math.PI]} />
              <primitive object={materials.mouth} attach="material" />
            </mesh>
            <mesh
              ref={(m) => {
                mouthRefs.current.bigSmile = m;
              }}
              rotation={[0, 0, Math.PI]}
              scale={0.0001}
              visible={false}
            >
              <torusGeometry args={[HEAD_R * 0.17, HEAD_R * 0.032, 8, 16, Math.PI]} />
              <primitive object={materials.mouth} attach="material" />
            </mesh>
            <mesh
              ref={(m) => {
                mouthRefs.current.frown = m;
              }}
              scale={0.0001}
              visible={false}
            >
              <torusGeometry args={[HEAD_R * 0.13, HEAD_R * 0.026, 8, 16, Math.PI]} />
              <primitive object={materials.mouth} attach="material" />
            </mesh>
            <mesh
              ref={(m) => {
                mouthRefs.current.openO = m;
              }}
              scale={0.0001}
              visible={false}
            >
              <torusGeometry args={[HEAD_R * 0.08, HEAD_R * 0.05, 10, 16]} />
              <primitive object={materials.mouth} attach="material" />
            </mesh>
            <mesh
              ref={(m) => {
                mouthRefs.current.flat = m;
              }}
              scale={0.0001}
              visible={false}
            >
              <boxGeometry args={[HEAD_R * 0.18, HEAD_R * 0.022, HEAD_R * 0.02]} />
              <primitive object={materials.mouth} attach="material" />
            </mesh>
            <mesh
              ref={(m) => {
                mouthRefs.current.wobble = m;
              }}
              rotation={[0, 0, 0.3]}
              scale={0.0001}
              visible={false}
            >
              <torusGeometry
                args={[HEAD_R * 0.12, HEAD_R * 0.028, 8, 16, Math.PI * 0.7]}
              />
              <primitive object={materials.mouth} attach="material" />
            </mesh>
          </group>

          <group ref={tipGroup} name="Tip" position={[0, HEAD_R * 0.92, 0]}>
            <mesh position={[0, STEM_LEN * 0.5, 0]}>
              <cylinderGeometry args={[TIP_R * 0.22, TIP_R * 0.28, STEM_LEN, 8]} />
              <primitive object={materials.skin} attach="material" />
            </mesh>
            <mesh ref={tip} position={[0, STEM_LEN + TIP_R * 0.85, 0]}>
              <sphereGeometry args={[TIP_R, 14, 14]} />
              <primitive object={materials.tipMat} attach="material" />
              <mesh ref={glow}>
                <sphereGeometry args={[TIP_R * 2.1, 12, 12]} />
                <primitive object={materials.glowMat} attach="material" />
              </mesh>
            </mesh>
          </group>
        </group>
      </group>
    );
  },
);
