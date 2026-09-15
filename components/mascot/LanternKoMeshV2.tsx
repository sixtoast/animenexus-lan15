"use client";

/**
 * Procedural Lantern-ko mesh — V3 continuous face rig + cute-again art pass.
 *
 * Engine state stays authoritative. Mesh only expresses resolveFaceRigPose channels.
 * Target: anime/chibi abstraction + believable behaviour (not realistic eyes).
 */

import * as THREE from "three";
import { forwardRef, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import type { MascotAnim, MascotEmotions } from "@/lib/mascot/types";
import { resolveFaceRigPose } from "@/lib/mascot/rig-adapter";
import { FACE_TUNING } from "@/lib/mascot/face-tuning";

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

export const EXPRESSIONS: Record<ExpressionKey, MeshExpressionPose> = {
  neutral: { brow: [0.04, -0.04], browY: 0, eyeY: 1, mouth: "flat", cheek: 0.12, pulse: 0.4 },
  happy: { brow: [0.12, -0.12], browY: 0.01, eyeY: 0.95, mouth: "smile", cheek: 0.32, pulse: 0.55 },
  excited: { brow: [0.22, -0.22], browY: 0.02, eyeY: 1.05, mouth: "bigSmile", cheek: 0.4, pulse: 1.2 },
  curious: { brow: [0.28, -0.04], browY: 0.015, eyeY: 1.05, mouth: "flat", cheek: 0.18, pulse: 0.65 },
  confused: { brow: [0.2, -0.16], browY: 0.01, eyeY: 0.9, mouth: "wobble", cheek: 0.1, pulse: 0.4 },
  surprised: { brow: [-0.25, 0.25], browY: 0.03, eyeY: 1.15, mouth: "openO", cheek: 0.12, pulse: 1.1 },
  embarrassed: { brow: [0.06, -0.06], browY: -0.005, eyeY: 0.9, mouth: "flat", cheek: 0.7, pulse: 0.5 },
  sad: { brow: [-0.22, 0.22], browY: -0.01, eyeY: 0.75, mouth: "frown", cheek: 0.06, pulse: 0.25 },
  sleepy: { brow: [0.06, -0.06], browY: -0.015, eyeY: 0.35, mouth: "flat", cheek: 0.08, pulse: 0.15 },
  scared: { brow: [-0.28, 0.28], browY: 0.025, eyeY: 1.12, mouth: "openO", cheek: 0.08, pulse: 1.2 },
  annoyed: { brow: [-0.18, 0.18], browY: -0.008, eyeY: 0.85, mouth: "frown", cheek: 0.1, pulse: 0.35 },
  proud: { brow: [0.1, -0.1], browY: 0.01, eyeY: 0.98, mouth: "smile", cheek: 0.28, pulse: 0.6 },
  mischievous: { brow: [0.22, -0.06], browY: 0.015, eyeY: 0.92, mouth: "smile", cheek: 0.22, pulse: 0.8 },
  focused: { brow: [-0.08, 0.08], browY: 0.008, eyeY: 0.95, mouth: "flat", cheek: 0.1, pulse: 0.45 },
  smug: { brow: [0.16, -0.04], browY: 0.008, eyeY: 0.88, mouth: "smile", cheek: 0.24, pulse: 0.55 },
};

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
  /** Soft dark rim under iris — not full white sclera. */
  eyeRim: "#3a2418",
  amber: "#f0b060",
  amberDeep: "#d4883a",
  pupil: "#2a1810",
  highlight: "#fff6e8",
  mouth: "#c4786a",
  tip: "#ffd9a8",
  brow: "#2a1810",
  hair: "#f5efe6",
  hairShade: "#e8dfd2",
  hood: "#2c241c",
  gold: "#d4a84b",
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

function mouthWeights(
  curve: number,
  open: number,
  expression: ExpressionKey,
): Record<MouthVariant, number> {
  const w: Record<MouthVariant, number> = {
    smile: 0,
    bigSmile: 0,
    frown: 0,
    openO: 0,
    flat: 0,
    wobble: 0,
  };

  if (open > 0.32) {
    w.openO = Math.min(1, (open - 0.18) / 0.5);
    if (curve > 0.12) w.smile = Math.max(0, 1 - w.openO) * Math.min(1, curve);
    else if (curve < -0.12)
      w.frown = Math.max(0, 1 - w.openO) * Math.min(1, -curve);
    else w.flat = Math.max(0, 1 - w.openO) * 0.45;
  } else if (curve > 0.48) {
    w.bigSmile = Math.min(1, (curve - 0.3) / 0.4);
    w.smile = Math.max(0, 1 - w.bigSmile);
  } else if (curve > 0.1) {
    w.smile = Math.min(1, (curve - 0.04) / 0.35);
    w.flat = Math.max(0, 1 - w.smile) * 0.4;
  } else if (curve < -0.2) {
    w.frown = Math.min(1, (-curve - 0.08) / 0.45);
    w.flat = Math.max(0, 1 - w.frown) * 0.35;
  } else if (expression === "confused") {
    w.wobble = 0.7;
    w.flat = 0.3;
  } else {
    w.flat = 1;
  }

  const sum = Object.values(w).reduce((a, b) => a + b, 0) || 1;
  for (const k of Object.keys(w) as MouthVariant[]) w[k] /= sum;
  return w;
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
    const irisL = useRef<THREE.Mesh>(null);
    const irisR = useRef<THREE.Mesh>(null);
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
    const blinkTimer = useRef(2.8);
    const blinkAmount = useRef(0);
    const headAim = useRef(new THREE.Vector2(0, 0));
    const settlePhase = useRef(0);
    const tipLag = useRef(new THREE.Vector2(0, 0));
    const browBaseY = HEAD_R * 0.26;

    const materials = useMemo(() => {
      const skin = new THREE.MeshStandardMaterial({
        color: PALETTE.skin,
        roughness: 0.5,
        metalness: 0.04,
      });
      const blush = new THREE.MeshStandardMaterial({
        color: PALETTE.blush,
        roughness: 0.55,
        transparent: true,
        opacity: 0.15,
        depthWrite: false,
      });
      const eyeRim = new THREE.MeshStandardMaterial({
        color: PALETTE.eyeRim,
        roughness: 0.4,
      });
      const amber = new THREE.MeshStandardMaterial({
        color: PALETTE.amber,
        emissive: PALETTE.amberDeep,
        emissiveIntensity: 0.12,
        roughness: 0.35,
      });
      const pupil = new THREE.MeshStandardMaterial({
        color: PALETTE.pupil,
        roughness: 0.35,
      });
      const highlight = new THREE.MeshBasicMaterial({
        color: PALETTE.highlight,
      });
      const mouth = new THREE.MeshStandardMaterial({
        color: PALETTE.mouth,
        roughness: 0.45,
      });
      const brow = new THREE.MeshStandardMaterial({
        color: PALETTE.brow,
        roughness: 0.65,
      });
      const tipMat = new THREE.MeshStandardMaterial({
        color: PALETTE.tip,
        emissive: PALETTE.tip,
        emissiveIntensity: 0.55,
        roughness: 0.3,
      });
      const glowMat = new THREE.MeshBasicMaterial({
        color: PALETTE.tip,
        transparent: true,
        opacity: 0.2,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      });
      const lid = new THREE.MeshStandardMaterial({
        color: PALETTE.skin,
        roughness: 0.5,
      });
      const hair = new THREE.MeshStandardMaterial({
        color: PALETTE.hair,
        roughness: 0.7,
      });
      const hairShade = new THREE.MeshStandardMaterial({
        color: PALETTE.hairShade,
        roughness: 0.75,
      });
      const hood = new THREE.MeshStandardMaterial({
        color: PALETTE.hood,
        roughness: 0.8,
      });
      return {
        skin,
        blush,
        eyeRim,
        amber,
        pupil,
        highlight,
        mouth,
        brow,
        tipMat,
        glowMat,
        lid,
        hair,
        hairShade,
        hood,
      };
    }, []);

    useFrame((state, delta) => {
      const dt = Math.min(delta, 0.05);
      const t = state.clock.elapsedTime;

      // Varied blink interval — not machine-regular.
      blinkTimer.current -= dt;
      if (blinkTimer.current <= 0) {
        blinkAmount.current = 1;
        blinkTimer.current = 2.4 + Math.random() * 3.6;
      }
      // Soft open curve after close (not mechanical shutter).
      if (blinkAmount.current > 0.55) {
        blinkAmount.current = Math.max(0, blinkAmount.current - dt * 9);
      } else {
        blinkAmount.current = Math.max(0, blinkAmount.current - dt * 5.5);
      }

      const rigPose = resolveFaceRigPose(
        expression,
        emotions,
        anim,
        t,
        lookBias,
        blinkAmount.current,
      );

      // Tight travel so pupils stay central in the large amber iris.
      const pupilX = rigPose.pupilX * HEAD_R * 0.022;
      const pupilY = rigPose.pupilY * HEAD_R * 0.016;
      const eyeSep = HEAD_R * FACE_TUNING.eyeSeparation;
      const eyeBaseY = HEAD_R * FACE_TUNING.eyeY;

      if (pupilL.current && pupilR.current) {
        pupilL.current.position.x = damp(
          pupilL.current.position.x,
          -eyeSep + pupilX,
          16,
          dt,
        );
        pupilR.current.position.x = damp(
          pupilR.current.position.x,
          eyeSep + pupilX,
          16,
          dt,
        );
        pupilL.current.position.y = damp(
          pupilL.current.position.y,
          eyeBaseY + pupilY,
          16,
          dt,
        );
        pupilR.current.position.y = damp(
          pupilR.current.position.y,
          eyeBaseY + pupilY,
          16,
          dt,
        );
      }
      if (irisL.current && irisR.current) {
        // Iris stays fixed; only pupil moves (anime style).
        irisL.current.position.x = -eyeSep;
        irisR.current.position.x = eyeSep;
        irisL.current.position.y = eyeBaseY;
        irisR.current.position.y = eyeBaseY;
      }

      // Soft anime upper lids — modest neutral, full only on sleep.
      if (lidL.current && lidR.current) {
        const closeL = 1 - Math.min(1, Math.max(0, rigPose.eyeOpenL));
        const closeR = 1 - Math.min(1, Math.max(0, rigPose.eyeOpenR));
        // Map: 0 open → scale.y ~0.06; full close → ~0.95 (covers iris, not a plate).
        const targetYL = 0.06 + closeL * 0.88;
        const targetYR = 0.06 + closeR * 0.88;
        const lambdaL = closeL > 0.85 ? 10 : 14;
        const lambdaR = closeR > 0.85 ? 10 : 14;
        lidL.current.scale.y = damp(lidL.current.scale.y, targetYL, lambdaL, dt);
        lidR.current.scale.y = damp(lidR.current.scale.y, targetYR, lambdaR, dt);
        lidL.current.position.y = damp(
          lidL.current.position.y,
          HEAD_R * (0.14 - closeL * 0.09),
          lambdaL,
          dt,
        );
        lidR.current.position.y = damp(
          lidR.current.position.y,
          HEAD_R * (0.14 - closeR * 0.09),
          lambdaR,
          dt,
        );
      }

      if (head.current) {
        const lookMag = Math.hypot(lookBias.x, lookBias.y);
        const headLambda = 3.6 + Math.min(5, lookMag * 6);
        headAim.current.x = damp(
          headAim.current.x,
          rigPose.headYaw,
          headLambda,
          dt,
        );
        headAim.current.y = damp(
          headAim.current.y,
          rigPose.headPitch,
          headLambda,
          dt,
        );
        head.current.rotation.y = headAim.current.x;
        head.current.rotation.x = headAim.current.y;
        head.current.rotation.z = damp(
          head.current.rotation.z,
          rigPose.headRoll,
          5.5,
          dt,
        );
      }

      if (browL.current && browR.current) {
        browL.current.rotation.z = damp(browL.current.rotation.z, rigPose.browL, 8, dt);
        browR.current.rotation.z = damp(browR.current.rotation.z, rigPose.browR, 8, dt);
        browL.current.position.y = damp(browL.current.position.y, browBaseY, 8, dt);
        browR.current.position.y = damp(browR.current.position.y, browBaseY, 8, dt);
      }

      const weights = mouthWeights(
        rigPose.mouthCurve,
        rigPose.mouthOpen,
        expression,
      );
      const wideScale = 0.88 + rigPose.mouthWide * 0.28;
      (Object.keys(mouthRefs.current) as MouthVariant[]).forEach((key) => {
        const m = mouthRefs.current[key];
        if (!m) return;
        const target = weights[key] * wideScale;
        const scale = damp(m.scale.x || 0.0001, Math.max(target, 0.0001), 11, dt);
        const s = Math.max(scale, 0.0001);
        m.scale.setScalar(s);
        m.visible = s > 0.015;
      });

      if (cheekL.current && cheekR.current) {
        const matL = cheekL.current.material as THREE.MeshStandardMaterial;
        const matR = cheekR.current.material as THREE.MeshStandardMaterial;
        const blushVis = Math.pow(rigPose.blush, 0.9) * 0.95;
        matL.opacity = damp(matL.opacity, blushVis, 6, dt);
        matR.opacity = damp(matR.opacity, blushVis, 6, dt);
      }

      if (tip.current) {
        const mat = tip.current.material as THREE.MeshStandardMaterial;
        const pulseHz =
          0.5 +
          emotions.energy * 0.7 +
          (EXPRESSIONS[expression]?.pulse ?? 0.4) * 0.12;
        const pulse = 0.5 + Math.sin(t * pulseHz * Math.PI * 2) * 0.35;
        mat.emissiveIntensity = pulse;
        if (glow.current) {
          const gMat = glow.current.material as THREE.MeshBasicMaterial;
          gMat.opacity = 0.1 + pulse * 0.12;
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

    const irisR = HEAD_R * FACE_TUNING.irisScale;
    const pupilR = HEAD_R * FACE_TUNING.pupilScale;
    const hlR = HEAD_R * FACE_TUNING.highlightScale;
    const eyeSep = HEAD_R * FACE_TUNING.eyeSeparation;
    const eyeBaseY = HEAD_R * FACE_TUNING.eyeY;
    const lidR = HEAD_R * (FACE_TUNING.irisScale + 0.012);

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
          {/* Dark hood silhouette — frames the cream head from behind/above */}
          <mesh
            position={[0, HEAD_R * 0.08, -HEAD_R * 0.15]}
            scale={[1.18, 1.12, 1.05]}
          >
            <sphereGeometry args={[HEAD_R * 1.05, 20, 16, 0, Math.PI * 2, 0, Math.PI * 0.72]} />
            <primitive object={materials.hood} attach="material" />
          </mesh>

          {/* Cream bob — side framing */}
          <mesh position={[-HEAD_R * 0.72, -HEAD_R * 0.05, HEAD_R * 0.1]}>
            <sphereGeometry args={[HEAD_R * 0.38, 12, 10]} />
            <primitive object={materials.hair} attach="material" />
          </mesh>
          <mesh position={[HEAD_R * 0.72, -HEAD_R * 0.05, HEAD_R * 0.1]}>
            <sphereGeometry args={[HEAD_R * 0.38, 12, 10]} />
            <primitive object={materials.hair} attach="material" />
          </mesh>
          {/* Soft bangs across forehead */}
          <mesh position={[0, HEAD_R * 0.55, HEAD_R * 0.55]} scale={[1.15, 0.45, 0.55]}>
            <sphereGeometry args={[HEAD_R * 0.42, 12, 8]} />
            <primitive object={materials.hairShade} attach="material" />
          </mesh>
          <mesh position={[-HEAD_R * 0.28, HEAD_R * 0.48, HEAD_R * 0.7]} scale={[0.7, 0.55, 0.5]}>
            <sphereGeometry args={[HEAD_R * 0.22, 10, 8]} />
            <primitive object={materials.hair} attach="material" />
          </mesh>
          <mesh position={[HEAD_R * 0.28, HEAD_R * 0.48, HEAD_R * 0.7]} scale={[0.7, 0.55, 0.5]}>
            <sphereGeometry args={[HEAD_R * 0.22, 10, 8]} />
            <primitive object={materials.hair} attach="material" />
          </mesh>

          <mesh castShadow>
            <sphereGeometry args={[HEAD_R, 28, 24]} />
            <primitive object={materials.skin} attach="material" />
          </mesh>

          <mesh
            ref={cheekL}
            position={[-HEAD_R * 0.5, -HEAD_R * 0.1, HEAD_R * 0.78]}
          >
            <sphereGeometry args={[HEAD_R * 0.18, 10, 10]} />
            <primitive object={materials.blush} attach="material" />
          </mesh>
          <mesh
            ref={cheekR}
            position={[HEAD_R * 0.5, -HEAD_R * 0.1, HEAD_R * 0.78]}
          >
            <sphereGeometry args={[HEAD_R * 0.18, 10, 10]} />
            <meshStandardMaterial
              color={PALETTE.blush}
              roughness={0.55}
              transparent
              opacity={0.15}
              depthWrite={false}
            />
          </mesh>

          {/* Soft dark rim (tiny — amber dominates) */}
          <mesh position={[-eyeSep, eyeBaseY, HEAD_R * 0.88]}>
            <sphereGeometry args={[irisR * 1.08, 14, 12]} />
            <primitive object={materials.eyeRim} attach="material" />
          </mesh>
          <mesh position={[eyeSep, eyeBaseY, HEAD_R * 0.88]}>
            <sphereGeometry args={[irisR * 1.08, 14, 12]} />
            <primitive object={materials.eyeRim} attach="material" />
          </mesh>

          {/* Large amber iris — primary eye mass */}
          <mesh
            ref={irisL}
            name="IrisL"
            position={[-eyeSep, eyeBaseY, HEAD_R * 0.94]}
          >
            <sphereGeometry args={[irisR, 16, 14]} />
            <primitive object={materials.amber} attach="material" />
          </mesh>
          <mesh
            ref={irisR}
            name="IrisR"
            position={[eyeSep, eyeBaseY, HEAD_R * 0.94]}
          >
            <sphereGeometry args={[irisR, 16, 14]} />
            <primitive object={materials.amber} attach="material" />
          </mesh>

          {/* Dark pupil inside amber */}
          <mesh
            ref={pupilL}
            name="PupilL"
            position={[-eyeSep, eyeBaseY, HEAD_R * 1.02]}
          >
            <sphereGeometry args={[pupilR, 12, 10]} />
            <primitive object={materials.pupil} attach="material" />
          </mesh>
          <mesh
            ref={pupilR}
            name="PupilR"
            position={[eyeSep, eyeBaseY, HEAD_R * 1.02]}
          >
            <sphereGeometry args={[pupilR, 12, 10]} />
            <primitive object={materials.pupil} attach="material" />
          </mesh>

          {/* Restrained cream catchlight */}
          <mesh position={[-eyeSep + HEAD_R * 0.035, eyeBaseY + HEAD_R * 0.04, HEAD_R * 1.06]}>
            <sphereGeometry args={[hlR, 8, 8]} />
            <primitive object={materials.highlight} attach="material" />
          </mesh>
          <mesh position={[eyeSep + HEAD_R * 0.035, eyeBaseY + HEAD_R * 0.04, HEAD_R * 1.06]}>
            <sphereGeometry args={[hlR, 8, 8]} />
            <primitive object={materials.highlight} attach="material" />
          </mesh>

          {/* Soft upper lids — thin skin-coloured bands */}
          <mesh
            ref={lidL}
            name="EyelidL"
            position={[-eyeSep, HEAD_R * 0.14, HEAD_R * 1.0]}
            scale={[1.05, 0.06, 0.85]}
          >
            <sphereGeometry args={[lidR, 12, 8]} />
            <primitive object={materials.lid} attach="material" />
          </mesh>
          <mesh
            ref={lidR}
            name="EyelidR"
            position={[eyeSep, HEAD_R * 0.14, HEAD_R * 1.0]}
            scale={[1.05, 0.06, 0.85]}
          >
            <sphereGeometry args={[lidR, 12, 8]} />
            <primitive object={materials.lid} attach="material" />
          </mesh>

          <mesh
            ref={browL}
            name="BrowL"
            position={[-eyeSep, browBaseY, HEAD_R * 0.9]}
          >
            <boxGeometry args={[HEAD_R * 0.28, HEAD_R * 0.035, HEAD_R * 0.04]} />
            <primitive object={materials.brow} attach="material" />
          </mesh>
          <mesh
            ref={browR}
            name="BrowR"
            position={[eyeSep, browBaseY, HEAD_R * 0.9]}
          >
            <boxGeometry args={[HEAD_R * 0.28, HEAD_R * 0.035, HEAD_R * 0.04]} />
            <primitive object={materials.brow} attach="material" />
          </mesh>

          <group name="Mouth" position={[0, -HEAD_R * 0.26, HEAD_R * 0.92]}>
            <mesh
              ref={(m) => {
                mouthRefs.current.smile = m;
              }}
              rotation={[0, 0, Math.PI]}
              scale={0.0001}
              visible={false}
            >
              <torusGeometry args={[HEAD_R * 0.14, HEAD_R * 0.024, 8, 16, Math.PI]} />
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
              <torusGeometry args={[HEAD_R * 0.16, HEAD_R * 0.028, 8, 16, Math.PI]} />
              <primitive object={materials.mouth} attach="material" />
            </mesh>
            <mesh
              ref={(m) => {
                mouthRefs.current.frown = m;
              }}
              scale={0.0001}
              visible={false}
            >
              <torusGeometry args={[HEAD_R * 0.12, HEAD_R * 0.022, 8, 16, Math.PI]} />
              <primitive object={materials.mouth} attach="material" />
            </mesh>
            <mesh
              ref={(m) => {
                mouthRefs.current.openO = m;
              }}
              scale={0.0001}
              visible={false}
            >
              <torusGeometry args={[HEAD_R * 0.07, HEAD_R * 0.04, 10, 14]} />
              <primitive object={materials.mouth} attach="material" />
            </mesh>
            <mesh
              ref={(m) => {
                mouthRefs.current.flat = m;
              }}
              scale={0.0001}
              visible={false}
            >
              <boxGeometry args={[HEAD_R * 0.14, HEAD_R * 0.018, HEAD_R * 0.018]} />
              <primitive object={materials.mouth} attach="material" />
            </mesh>
            <mesh
              ref={(m) => {
                mouthRefs.current.wobble = m;
              }}
              rotation={[0, 0, 0.25]}
              scale={0.0001}
              visible={false}
            >
              <torusGeometry
                args={[HEAD_R * 0.11, HEAD_R * 0.022, 8, 14, Math.PI * 0.65]}
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
                <sphereGeometry args={[TIP_R * 2.0, 12, 12]} />
                <primitive object={materials.glowMat} attach="material" />
              </mesh>
            </mesh>
          </group>
        </group>
      </group>
    );
  },
);
