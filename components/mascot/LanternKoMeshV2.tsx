"use client";

/**
 * Procedural Lantern-ko mesh (Claude upgrade path).
 * Face + tip + squash owned here; parent owns locomotion transform.
 */

import * as THREE from "three";
import { forwardRef, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { MATERIALS, PALETTE } from "@/lib/mascot/visual";

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

export type MeshExpressionPose = {
  browRotZ: [number, number];
  eyeScaleY: number;
  mouth: "smile" | "bigSmile" | "frown" | "openO" | "flat" | "wobble";
  tipPulseHz: number;
  cheekOpacity: number;
  headTilt: number;
};

/** Shared with GltfCompanion so GLB and procedural stay in lockstep. */
export const EXPRESSIONS: Record<ExpressionKey, MeshExpressionPose> = {
  neutral: {
    browRotZ: [0, 0],
    eyeScaleY: 1,
    mouth: "flat",
    tipPulseHz: 0.9,
    cheekOpacity: 0.25,
    headTilt: 0,
  },
  happy: {
    browRotZ: [0.12, 0.12],
    eyeScaleY: 0.95,
    mouth: "smile",
    tipPulseHz: 1.4,
    cheekOpacity: 0.55,
    headTilt: 0.04,
  },
  excited: {
    browRotZ: [0.2, 0.2],
    eyeScaleY: 1.05,
    mouth: "bigSmile",
    tipPulseHz: 2.2,
    cheekOpacity: 0.7,
    headTilt: 0.08,
  },
  curious: {
    browRotZ: [0.18, 0.04],
    eyeScaleY: 1,
    mouth: "openO",
    tipPulseHz: 1.3,
    cheekOpacity: 0.3,
    headTilt: 0.12,
  },
  confused: {
    browRotZ: [0.14, -0.1],
    eyeScaleY: 0.85,
    mouth: "wobble",
    tipPulseHz: 0.8,
    cheekOpacity: 0.2,
    headTilt: -0.1,
  },
  surprised: {
    browRotZ: [0.25, 0.25],
    eyeScaleY: 1.15,
    mouth: "openO",
    tipPulseHz: 1.8,
    cheekOpacity: 0.25,
    headTilt: 0,
  },
  embarrassed: {
    browRotZ: [-0.06, -0.06],
    eyeScaleY: 0.7,
    mouth: "flat",
    tipPulseHz: 1.1,
    cheekOpacity: 0.95,
    headTilt: 0.15,
  },
  sad: {
    browRotZ: [-0.16, -0.16],
    eyeScaleY: 0.65,
    mouth: "frown",
    tipPulseHz: 0.6,
    cheekOpacity: 0.15,
    headTilt: -0.05,
  },
  sleepy: {
    browRotZ: [-0.1, -0.1],
    eyeScaleY: 0.28,
    mouth: "flat",
    tipPulseHz: 0.45,
    cheekOpacity: 0.18,
    headTilt: 0.08,
  },
  scared: {
    browRotZ: [0.22, 0.22],
    eyeScaleY: 1.2,
    mouth: "openO",
    tipPulseHz: 2,
    cheekOpacity: 0.12,
    headTilt: 0,
  },
  annoyed: {
    browRotZ: [-0.18, -0.18],
    eyeScaleY: 0.75,
    mouth: "frown",
    tipPulseHz: 0.85,
    cheekOpacity: 0.18,
    headTilt: 0,
  },
  proud: {
    browRotZ: [0.1, 0.1],
    eyeScaleY: 0.95,
    mouth: "smile",
    tipPulseHz: 1.2,
    cheekOpacity: 0.4,
    headTilt: -0.04,
  },
  mischievous: {
    browRotZ: [0.16, -0.02],
    eyeScaleY: 0.8,
    mouth: "smile",
    tipPulseHz: 1.5,
    cheekOpacity: 0.32,
    headTilt: 0.1,
  },
  focused: {
    browRotZ: [-0.06, -0.06],
    eyeScaleY: 0.9,
    mouth: "flat",
    tipPulseHz: 0.95,
    cheekOpacity: 0.18,
    headTilt: 0,
  },
  smug: {
    browRotZ: [0.12, -0.04],
    eyeScaleY: 0.7,
    mouth: "smile",
    tipPulseHz: 1.15,
    cheekOpacity: 0.35,
    headTilt: 0.06,
  },
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

/** Mouth mesh scale/rotation from variant name */
function applyMouth(
  mesh: THREE.Mesh,
  variant: MeshExpressionPose["mouth"],
  dt: number,
) {
  let sy = 1;
  let sx = 1;
  let rz = 0;
  switch (variant) {
    case "smile":
      sy = 0.55;
      sx = 1.15;
      rz = 0.15;
      break;
    case "bigSmile":
      sy = 0.75;
      sx = 1.35;
      rz = 0.2;
      break;
    case "frown":
      sy = 0.5;
      sx = 1.05;
      rz = -0.25;
      break;
    case "openO":
      sy = 1.25;
      sx = 0.85;
      rz = 0;
      break;
    case "wobble":
      sy = 0.6;
      sx = 1.1;
      rz = Math.sin(performance.now() * 0.008) * 0.12;
      break;
    case "flat":
    default:
      sy = 0.45;
      sx = 1;
      rz = 0.05;
  }
  mesh.scale.x = damp(mesh.scale.x, sx, 12, dt);
  mesh.scale.y = damp(mesh.scale.y, sy, 12, dt);
  mesh.rotation.z = damp(mesh.rotation.z, rz, 10, dt);
}

export const LanternKoMesh = forwardRef<THREE.Group, LanternKoMeshProps>(
  function LanternKoMesh(
    { expression = "neutral", yaw = 0, speed = 0, justLanded = false },
    ref,
  ) {
    const pose = useRef<THREE.Group>(null);
    const head = useRef<THREE.Group>(null);
    const tip = useRef<THREE.Mesh>(null);
    const browL = useRef<THREE.Mesh>(null);
    const browR = useRef<THREE.Mesh>(null);
    const eyeL = useRef<THREE.Mesh>(null);
    const eyeR = useRef<THREE.Mesh>(null);
    const mouth = useRef<THREE.Mesh>(null);
    const cheekL = useRef<THREE.Mesh>(null);
    const cheekR = useRef<THREE.Mesh>(null);
    const armL = useRef<THREE.Mesh>(null);
    const armR = useRef<THREE.Mesh>(null);
    const squashEnv = useRef(0);
    const tipLag = useRef(new THREE.Vector2(0, 0));
    const blinkGate = useRef(0);

    useFrame((state, delta) => {
      const dt = Math.min(delta, 0.05);
      const t = state.clock.elapsedTime;
      const expr = EXPRESSIONS[expression] ?? EXPRESSIONS.neutral;

      // Blink
      blinkGate.current += dt;
      let blinkMul = 1;
      if (expression === "sleepy") blinkMul = expr.eyeScaleY;
      else if (Math.sin(t * 0.7) > 0.97) blinkMul = 0.12;
      else blinkMul = expr.eyeScaleY;

      if (browL.current && browR.current) {
        browL.current.rotation.z = damp(
          browL.current.rotation.z,
          expr.browRotZ[0],
          8,
          dt,
        );
        browR.current.rotation.z = damp(
          browR.current.rotation.z,
          expr.browRotZ[1],
          8,
          dt,
        );
      }
      if (eyeL.current && eyeR.current) {
        eyeL.current.scale.y = damp(eyeL.current.scale.y, blinkMul, 14, dt);
        eyeR.current.scale.y = damp(eyeR.current.scale.y, blinkMul, 14, dt);
      }
      if (mouth.current) applyMouth(mouth.current, expr.mouth, dt);

      if (cheekL.current && cheekR.current) {
        const matL = cheekL.current.material as THREE.MeshStandardMaterial;
        const matR = cheekR.current.material as THREE.MeshStandardMaterial;
        matL.opacity = damp(matL.opacity, expr.cheekOpacity, 6, dt);
        matR.opacity = damp(matR.opacity, expr.cheekOpacity, 6, dt);
      }

      if (head.current) {
        head.current.rotation.z = damp(
          head.current.rotation.z,
          expr.headTilt,
          6,
          dt,
        );
      }

      if (tip.current) {
        const mat = tip.current.material as THREE.MeshStandardMaterial;
        mat.emissiveIntensity =
          0.55 +
          Math.sin(t * expr.tipPulseHz * Math.PI * 2) * 0.35 +
          speed * 0.08;
        const targetX = Math.sin(t * 2.2) * 0.05 * (0.4 + speed);
        const targetZ = -yaw * 0.12;
        tipLag.current.x = damp(tipLag.current.x, targetX, 5, dt);
        tipLag.current.y = damp(tipLag.current.y, targetZ, 4, dt);
        tip.current.rotation.x = tipLag.current.x;
        tip.current.rotation.z = tipLag.current.y;
      }

      // Soft arm idle / walk swing from speed
      const swing = Math.sin(t * (6 + speed * 4)) * 0.25 * Math.min(1, speed + 0.2);
      if (armL.current) armL.current.rotation.x = damp(armL.current.rotation.x, swing, 8, dt);
      if (armR.current)
        armR.current.rotation.x = damp(armR.current.rotation.x, -swing, 8, dt);

      // Landing squash
      if (justLanded) squashEnv.current = 1;
      squashEnv.current = damp(squashEnv.current, 0, 6, dt);
      const sq = squashEnv.current;
      const g = pose.current;
      if (g) {
        g.scale.set(1 + sq * 0.12, 1 - sq * 0.18, 1 + sq * 0.12);
      }

      // Breath
      if (g && sq < 0.05) {
        const breath = 1 + Math.sin(t * 1.8) * 0.015;
        g.scale.y *= breath;
      }
    });

    const skin = MATERIALS.skin;
    const bodyMat = MATERIALS.body;
    const eye = MATERIALS.eye;
    const tipMat = MATERIALS.tip;

    return (
      <group
        ref={(node) => {
          pose.current = node;
          if (typeof ref === "function") ref(node);
          else if (ref) ref.current = node;
        }}
      >
        {/* Body */}
        <mesh name="Body" position={[0, -0.35, 0]} castShadow>
          <capsuleGeometry args={[0.22, 0.28, 8, 16]} />
          <meshStandardMaterial
            color={bodyMat.color}
            roughness={bodyMat.roughness}
            metalness={bodyMat.metalness}
          />
        </mesh>

        <group ref={head} name="Head" position={[0, 0.22, 0]}>
          <mesh castShadow>
            <sphereGeometry args={[0.42, 36, 36]} />
            <meshStandardMaterial
              color={skin.color}
              roughness={skin.roughness}
              metalness={skin.metalness}
            />
          </mesh>

          <mesh ref={cheekL} name="CheekL" position={[-0.22, -0.08, 0.32]}>
            <sphereGeometry args={[0.08, 12, 12]} />
            <meshStandardMaterial
              color={PALETTE.blush}
              transparent
              opacity={0.4}
              roughness={0.55}
              depthWrite={false}
            />
          </mesh>
          <mesh ref={cheekR} name="CheekR" position={[0.22, -0.08, 0.32]}>
            <sphereGeometry args={[0.08, 12, 12]} />
            <meshStandardMaterial
              color={PALETTE.blush}
              transparent
              opacity={0.4}
              roughness={0.55}
              depthWrite={false}
            />
          </mesh>

          <mesh ref={browL} name="BrowL" position={[-0.14, 0.16, 0.38]}>
            <boxGeometry args={[0.1, 0.025, 0.03]} />
            <meshStandardMaterial color={PALETTE.eye} roughness={0.5} />
          </mesh>
          <mesh ref={browR} name="BrowR" position={[0.14, 0.16, 0.38]}>
            <boxGeometry args={[0.1, 0.025, 0.03]} />
            <meshStandardMaterial color={PALETTE.eye} roughness={0.5} />
          </mesh>

          <mesh ref={eyeL} name="EyeL" position={[-0.14, 0.06, 0.37]}>
            <sphereGeometry args={[0.078, 16, 16]} />
            <meshStandardMaterial
              color={eye.color}
              roughness={eye.roughness}
              metalness={eye.metalness}
            />
          </mesh>
          <mesh ref={eyeR} name="EyeR" position={[0.14, 0.06, 0.37]}>
            <sphereGeometry args={[0.078, 16, 16]} />
            <meshStandardMaterial
              color={eye.color}
              roughness={eye.roughness}
              metalness={eye.metalness}
            />
          </mesh>
          <mesh position={[-0.12, 0.1, 0.43]}>
            <sphereGeometry args={[0.022, 8, 8]} />
            <meshBasicMaterial color={PALETTE.eyeHighlight} />
          </mesh>
          <mesh position={[0.16, 0.1, 0.43]}>
            <sphereGeometry args={[0.022, 8, 8]} />
            <meshBasicMaterial color={PALETTE.eyeHighlight} />
          </mesh>

          <mesh
            ref={mouth}
            name="Mouth"
            position={[0, -0.1, 0.39]}
            rotation={[0.25, 0, 0]}
          >
            <torusGeometry args={[0.06, 0.014, 8, 16, Math.PI]} />
            <meshStandardMaterial color={PALETTE.mouth} roughness={0.5} />
          </mesh>

          <mesh ref={tip} name="Tip" position={[0, 0.48, 0]}>
            <sphereGeometry args={[0.085, 14, 14]} />
            <meshStandardMaterial
              color={tipMat.color}
              emissive={tipMat.emissive}
              emissiveIntensity={tipMat.emissiveIntensity}
              roughness={tipMat.roughness}
              metalness={tipMat.metalness}
            />
          </mesh>
          <mesh position={[0, 0.38, 0]}>
            <cylinderGeometry args={[0.02, 0.02, 0.12, 8]} />
            <meshStandardMaterial color={PALETTE.skinDeep} />
          </mesh>
        </group>

        <mesh
          ref={armL}
          name="ArmL"
          position={[-0.32, -0.28, 0]}
          rotation={[0, 0, 0.4]}
        >
          <capsuleGeometry args={[0.07, 0.16, 4, 10]} />
          <meshStandardMaterial
            color={bodyMat.color}
            roughness={bodyMat.roughness}
          />
        </mesh>
        <mesh
          ref={armR}
          name="ArmR"
          position={[0.32, -0.28, 0]}
          rotation={[0, 0, -0.4]}
        >
          <capsuleGeometry args={[0.07, 0.16, 4, 10]} />
          <meshStandardMaterial
            color={bodyMat.color}
            roughness={bodyMat.roughness}
          />
        </mesh>
      </group>
    );
  },
);
