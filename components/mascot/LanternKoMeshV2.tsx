"use client";

/**
 * Procedural Lantern-ko mesh — V3 continuous face rig.
 *
 * Engine state (expression / emotions / anim / lookBias) stays authoritative.
 * This mesh only expresses continuous channels from resolveFaceRigPose.
 * Proportions & secondary motion aligned with lib/mascot/expression.ts.
 */

import * as THREE from "three";
import { forwardRef, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import type { MascotAnim, MascotEmotions } from "@/lib/mascot/types";
import { resolveFaceRigPose } from "@/lib/mascot/rig-adapter";

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
  /** Amber iris / pupil — Lantern-ko identity (not reference-mascot orange hair). */
  pupil: "#f2b86f",
};

const DEFAULT_EMOTIONS: MascotEmotions = {
  curiosity: 0.5,
  energy: 0.5,
  happiness: 0.5,
  boredom: 0.2,
  sleepiness: 0.1,
  attention: 0.5,
  confidence: 0.5,
  stress: 0.1,
};

export type LanternKoMeshProps = {
  expression?: ExpressionKey;
  emotions?: MascotEmotions;
  lookBias?: { x: number; y: number };
  anim?: MascotAnim;
  yaw?: number;
  speed?: number;
  justLanded?: boolean;
};

function damp(current: number, target: number, lambda: number, dt: number) {
  return THREE.MathUtils.damp(current, target, lambda, dt);
}

export const LanternKoMesh = forwardRef<THREE.Group, LanternKoMeshProps>(
  function LanternKoMesh(
    {
      expression = "neutral",
      emotions = DEFAULT_EMOTIONS,
      lookBias = { x: 0, y: 0 },
      anim = "idle",
      yaw = 0,
      speed = 0,
      justLanded = false,
    },
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
    const pupilL = useRef<THREE.Mesh>(null);
    const pupilR = useRef<THREE.Mesh>(null);
    const lidL = useRef<THREE.Mesh>(null);
    const lidR = useRef<THREE.Mesh>(null);
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
    const blinkTimer = useRef(2.2);
    const blinkAmount = useRef(0);
    const headAim = useRef(new THREE.Vector2(0, 0));
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
      const pupil = new THREE.MeshStandardMaterial({
        color: PALETTE.pupil,
        roughness: 0.25,
        emissive: "#5a2f12",
        emissiveIntensity: 0.08,
      });
      const lid = new THREE.MeshStandardMaterial({
        color: PALETTE.skin,
        roughness: 0.45,
      });
      return { skin, blush, eye, mouth, brow, tipMat, glowMat, hl, pupil, lid };
    }, []);

    useFrame((state, delta) => {
      const dt = Math.min(delta, 0.05);
      const t = state.clock.elapsedTime;

      // Procedural blink below Utility AI — does not issue BLINK actions.
      blinkTimer.current -= dt;
      if (blinkTimer.current <= 0) {
        blinkAmount.current = 1;
        blinkTimer.current = 2.5 + Math.random() * 3;
      }
      blinkAmount.current = Math.max(0, blinkAmount.current - dt * 7);

      const rigPose = resolveFaceRigPose(
        expression,
        emotions,
        anim,
        t,
        lookBias,
        blinkAmount.current,
      );

      // Stable eyeballs: gaze moves amber pupil; lids close over the eye.
      // Do not scale the whole eyeball to blink.
      const pupilX = rigPose.pupilX * HEAD_R * 0.045;
      const pupilY = rigPose.pupilY * HEAD_R * 0.035;
      if (pupilL.current && pupilR.current) {
        pupilL.current.position.x = damp(
          pupilL.current.position.x,
          -HEAD_R * 0.32 + pupilX,
          18,
          dt,
        );
        pupilR.current.position.x = damp(
          pupilR.current.position.x,
          HEAD_R * 0.32 + pupilX,
          18,
          dt,
        );
        pupilL.current.position.y = damp(
          pupilL.current.position.y,
          HEAD_R * 0.02 + pupilY,
          18,
          dt,
        );
        pupilR.current.position.y = damp(
          pupilR.current.position.y,
          HEAD_R * 0.02 + pupilY,
          18,
          dt,
        );
      }
      if (lidL.current && lidR.current) {
        const closeL = 1 - Math.min(1, rigPose.eyeOpenL);
        const closeR = 1 - Math.min(1, rigPose.eyeOpenR);
        lidL.current.scale.y = damp(
          lidL.current.scale.y,
          0.08 + closeL * 1.08,
          16,
          dt,
        );
        lidR.current.scale.y = damp(
          lidR.current.scale.y,
          0.08 + closeR * 1.08,
          16,
          dt,
        );
        lidL.current.position.y = damp(
          lidL.current.position.y,
          HEAD_R * (0.12 - closeL * 0.1),
          16,
          dt,
        );
        lidR.current.position.y = damp(
          lidR.current.position.y,
          HEAD_R * (0.12 - closeR * 0.1),
          16,
          dt,
        );
      }

      // Eyes lead; head follows more slowly. lookBias is engine-authoritative.
      if (head.current) {
        headAim.current.x = damp(headAim.current.x, rigPose.headYaw, 5.2, dt);
        headAim.current.y = damp(headAim.current.y, rigPose.headPitch, 5.2, dt);
        head.current.rotation.y = headAim.current.x;
        head.current.rotation.x = headAim.current.y;
        head.current.rotation.z = damp(
          head.current.rotation.z,
          rigPose.headRoll,
          6,
          dt,
        );
      }

      if (browL.current && browR.current) {
        browL.current.rotation.z = damp(
          browL.current.rotation.z,
          rigPose.browL,
          8,
          dt,
        );
        browR.current.rotation.z = damp(
          browR.current.rotation.z,
          rigPose.browR,
          8,
          dt,
        );
        browL.current.position.y = damp(
          browL.current.position.y,
          browBaseY,
          8,
          dt,
        );
        browR.current.position.y = damp(
          browR.current.position.y,
          browBaseY,
          8,
          dt,
        );
      }

      const resolvedMouth: MouthVariant =
        rigPose.mouthOpen > 0.48
          ? "openO"
          : rigPose.mouthCurve > 0.62
            ? "bigSmile"
            : rigPose.mouthCurve > 0.18
              ? "smile"
              : rigPose.mouthCurve < -0.32
                ? "frown"
                : expression === "confused"
                  ? "wobble"
                  : "flat";

      (Object.keys(mouthRefs.current) as MouthVariant[]).forEach((key) => {
        const m = mouthRefs.current[key];
        if (!m) return;
        const active = key === resolvedMouth;
        const target = active ? 1 : 0;
        const scale = damp(m.scale.x || 0.0001, target, 14, dt);
        const s = Math.max(scale, 0.0001);
        m.scale.setScalar(s);
        m.visible = s > 0.02;
      });

      if (cheekL.current && cheekR.current) {
        const matL = cheekL.current.material as THREE.MeshStandardMaterial;
        const matR = cheekR.current.material as THREE.MeshStandardMaterial;
        matL.opacity = damp(matL.opacity, rigPose.blush, 6, dt);
        matR.opacity = damp(matR.opacity, rigPose.blush, 6, dt);
      }

      if (tip.current) {
        const mat = tip.current.material as THREE.MeshStandardMaterial;
        const pulseHz =
          0.55 + emotions.energy * 0.8 +
          (EXPRESSIONS[expression]?.pulse ?? 0.4) * 0.15;
        const pulse =
          0.55 + Math.sin(t * pulseHz * Math.PI * 2) * 0.4;
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
        bodyGroup.current.scale.set(
          1 + sq * 0.12,
          1 - sq * 0.18,
          1 + sq * 0.12,
        );
      }
      settlePhase.current += dt * 9;
      const wobble = Math.sin(settlePhase.current) * sq * 0.25;
      if (armL.current) armL.current.rotation.x = wobble;
      if (armR.current) armR.current.rotation.x = -wobble;

      if (root.current) {
        root.current.position.y =
          Math.sin(t * 1.4) * 0.015 * (0.5 + speed);
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

          {/* Stable dark eyeball */}
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

          {/* Amber pupil / iris — independent gaze */}
          <mesh
            ref={pupilL}
            name="PupilL"
            position={[-HEAD_R * 0.32, HEAD_R * 0.02, HEAD_R * 1.01]}
          >
            <sphereGeometry args={[HEAD_R * 0.055, 12, 12]} />
            <primitive object={materials.pupil} attach="material" />
          </mesh>
          <mesh
            ref={pupilR}
            name="PupilR"
            position={[HEAD_R * 0.32, HEAD_R * 0.02, HEAD_R * 1.01]}
          >
            <sphereGeometry args={[HEAD_R * 0.055, 12, 12]} />
            <primitive object={materials.pupil} attach="material" />
          </mesh>

          {/* Independent eyelids — close over stable eyes */}
          <mesh
            ref={lidL}
            name="EyelidL"
            position={[-HEAD_R * 0.32, HEAD_R * 0.12, HEAD_R * 1.015]}
            scale={[1, 0.08, 1]}
          >
            <sphereGeometry args={[HEAD_R * 0.135, 14, 10]} />
            <primitive object={materials.lid} attach="material" />
          </mesh>
          <mesh
            ref={lidR}
            name="EyelidR"
            position={[HEAD_R * 0.32, HEAD_R * 0.12, HEAD_R * 1.015]}
            scale={[1, 0.08, 1]}
          >
            <sphereGeometry args={[HEAD_R * 0.135, 14, 10]} />
            <primitive object={materials.lid} attach="material" />
          </mesh>

          {/* Specular highlights (fixed relative to eye centre) */}
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
              <torusGeometry
                args={[HEAD_R * 0.15, HEAD_R * 0.028, 8, 16, Math.PI]}
              />
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
              <torusGeometry
                args={[HEAD_R * 0.17, HEAD_R * 0.032, 8, 16, Math.PI]}
              />
              <primitive object={materials.mouth} attach="material" />
            </mesh>
            <mesh
              ref={(m) => {
                mouthRefs.current.frown = m;
              }}
              scale={0.0001}
              visible={false}
            >
              <torusGeometry
                args={[HEAD_R * 0.13, HEAD_R * 0.026, 8, 16, Math.PI]}
              />
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
              <boxGeometry
                args={[HEAD_R * 0.18, HEAD_R * 0.022, HEAD_R * 0.02]}
              />
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
              <cylinderGeometry
                args={[TIP_R * 0.22, TIP_R * 0.28, STEM_LEN, 8]}
              />
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
