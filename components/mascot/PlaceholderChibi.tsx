"use client";

import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { useMascotStore } from "@/lib/mascot/store";
import { HABITAT_BOUNDS } from "@/lib/mascot/types";
import { motionFromEmotions } from "@/lib/mascot/emotions";
import {
  applyJump,
  applyClimbJump,
  createBody,
  stepPhysics,
  steerToward,
  teleportBody,
  type PhysicsBody,
} from "@/lib/mascot/physics";

export function PlaceholderChibi() {
  const root = useRef<THREE.Group>(null);
  const pose = useRef<THREE.Group>(null);
  const head = useRef<THREE.Group>(null);
  const tip = useRef<THREE.Mesh>(null);
  const leftEye = useRef<THREE.Mesh>(null);
  const rightEye = useRef<THREE.Mesh>(null);
  const leftArm = useRef<THREE.Mesh>(null);
  const rightArm = useRef<THREE.Mesh>(null);
  const cheekL = useRef<THREE.Mesh>(null);
  const cheekR = useRef<THREE.Mesh>(null);
  const pointer = useRef({ x: 0, y: 0 });
  const facing = useRef(0);
  const decayAcc = useRef(0);
  const body = useRef<PhysicsBody>(createBody(0, 0));
  const wasAirborne = useRef(false);
  const dragging = useRef(false);
  const lastClick = useRef(0);
  const lastStorePos = useRef({ x: 0, z: 0 });
  const dragStart = useRef({ x: 0, z: 0, moved: false });

  useFrame((state, delta) => {
    const t = state.clock.elapsedTime;
    const dt = Math.min(delta, 0.05);
    const store = useMascotStore.getState();
    const {
      anim,
      target,
      setPosition,
      setTarget,
      setAnim,
      emotions,
      decayEmotions,
      dispatch,
      lookBias,
      consumeJump,
    } = store;

    const motion = motionFromEmotions(emotions);

    decayAcc.current += dt;
    if (decayAcc.current > 1) {
      decayEmotions(decayAcc.current);
      dispatch({ type: "tick" });
      decayAcc.current = 0;
    }

    const g = root.current;
    const p = pose.current;
    if (!g || !p) return;

    if (
      Math.abs(store.position.x - lastStorePos.current.x) > 0.15 ||
      Math.abs(store.position.z - lastStorePos.current.z) > 0.15
    ) {
      if (!dragging.current) {
        body.current = teleportBody(
          body.current,
          store.position.x,
          store.position.z,
        );
      }
    }
    lastStorePos.current = { x: store.position.x, z: store.position.z };

    if (consumeJump()) {
      const climbing = !!(target && Math.abs(target.x) > 0.28);
      body.current = climbing
        ? applyClimbJump(body.current, 0.35)
        : applyJump(body.current, 2.8 + emotions.energy * 0.8);
      setAnim("jump");
    }

    if (
      target &&
      body.current.onGround &&
      anim !== "sleep" &&
      anim !== "happy" &&
      anim !== "wave" &&
      anim !== "point"
    ) {
      const speed = Math.max(0.25, motion.walkSpeed);
      body.current = steerToward(
        body.current,
        target.x,
        target.z,
        speed,
        dt,
      );
      const d = Math.hypot(
        target.x - body.current.x,
        target.z - body.current.z,
      );
      if (d < 0.05) {
        setTarget(null);
        body.current.vx = 0;
        body.current.vz = 0;
        if (anim === "walk" || anim === "jump") setAnim("idle");
      } else if (anim !== "jump" && anim !== "land") {
        setAnim("walk");
      }
      facing.current = Math.atan2(
        target.x - body.current.x,
        target.z - body.current.z,
      );
    }

    body.current = stepPhysics(body.current, dt);

    body.current.x = Math.max(
      HABITAT_BOUNDS.minX,
      Math.min(HABITAT_BOUNDS.maxX, body.current.x),
    );
    body.current.z = Math.max(
      HABITAT_BOUNDS.minZ,
      Math.min(HABITAT_BOUNDS.maxZ, body.current.z),
    );

    if (wasAirborne.current && body.current.onGround) {
      setAnim("land");
      window.setTimeout(() => {
        if (useMascotStore.getState().anim === "land") setAnim("idle");
      }, 280);
    }
    wasAirborne.current = !body.current.onGround;

    setPosition({ x: body.current.x, z: body.current.z });

    const jit = motion.jitter;
    g.position.x = body.current.x + (jit ? Math.sin(t * 20) * jit : 0);
    g.position.z = body.current.z;
    g.position.y = -0.15 + body.current.y * 0.22;
    g.rotation.y = THREE.MathUtils.lerp(
      g.rotation.y,
      facing.current,
      1 - Math.pow(0.001, dt),
    );

    const breathe = Math.sin(t * (1.8 + emotions.energy)) * 0.02;
    let bob = Math.sin(t * 1.6) * 0.02 * motion.bobAmp;
    let scale = 0.96 + motion.poseOpenness * 0.08;
    let rotZ = 0;
    let armSwing = 0;
    let headPitch = motion.headDroop;
    let pointArm = false;

    switch (anim) {
      case "walk": {
        const gait = t * (8 + emotions.energy * 4);
        bob = Math.abs(Math.sin(gait)) * 0.055 * motion.bobAmp;
        armSwing = Math.sin(gait) * 0.4 * motion.armAmp;
        rotZ = Math.sin(gait) * 0.035;
        break;
      }
      case "jump":
        scale *= 1.04;
        bob = 0.06;
        armSwing = -0.4;
        headPitch = -0.15;
        break;
      case "land":
        scale *= 0.94;
        bob = -0.04;
        armSwing = 0.3;
        break;
      case "happy":
        scale *= 1 + Math.sin(t * 14) * 0.045;
        bob = Math.abs(Math.sin(t * 10)) * 0.11 * motion.bobAmp;
        rotZ = Math.sin(t * 12) * 0.08;
        armSwing = Math.sin(t * 14) * 0.55 * motion.armAmp;
        headPitch = -0.05;
        break;
      case "wave":
        bob = 0.04 + breathe;
        armSwing = 0.25 + Math.sin(t * 9) * 0.9;
        rotZ = Math.sin(t * 6) * 0.1;
        break;
      case "point":
        bob = 0.02 + breathe;
        pointArm = true;
        headPitch = -0.08;
        armSwing = 0.1;
        break;
      case "think":
        bob = breathe;
        headPitch = -0.22 + Math.sin(t * 1.2) * 0.05 + motion.headDroop;
        armSwing = 0.12;
        rotZ = 0.06;
        break;
      case "sleep":
        bob = -0.08 + breathe * 0.5;
        rotZ = -0.18;
        headPitch = 0.35;
        break;
      case "surprised":
        scale *= 1.06;
        bob = 0.08;
        headPitch = -0.12;
        armSwing = 0.5;
        break;
      default:
        bob = bob + breathe * 0.5;
    }

    p.position.y = bob;
    p.rotation.z = rotZ;
    p.scale.setScalar(scale * (1 + breathe * 0.35));

    if (leftArm.current) leftArm.current.rotation.x = armSwing;
    if (rightArm.current) {
      if (pointArm) {
        rightArm.current.rotation.x = -1.1;
        rightArm.current.rotation.z = -0.2;
      } else {
        rightArm.current.rotation.x = anim === "wave" ? -0.2 : -armSwing;
        rightArm.current.rotation.z =
          anim === "wave" ? -0.5 + Math.sin(t * 9) * 0.55 : -0.4;
      }
    }

    if (head.current) {
      const lookY = pointer.current.x * 0.2 + lookBias.x * 0.2;
      const lookX = -pointer.current.y * 0.12 + headPitch - lookBias.y * 0.12;
      head.current.rotation.y = THREE.MathUtils.lerp(
        head.current.rotation.y,
        lookY,
        0.08,
      );
      head.current.rotation.x = THREE.MathUtils.lerp(
        head.current.rotation.x,
        lookX,
        0.08,
      );
    }

    if (tip.current) {
      const mat = tip.current.material as THREE.MeshStandardMaterial;
      mat.emissiveIntensity = 0.2 + motion.glow * 0.7;
    }

    const cheekOp = 0.35 + emotions.happiness * 0.4;
    if (cheekL.current) {
      (cheekL.current.material as THREE.MeshStandardMaterial).opacity = cheekOp;
    }
    if (cheekR.current) {
      (cheekR.current.material as THREE.MeshStandardMaterial).opacity = cheekOp;
    }

    const blink =
      anim === "sleep" ? 0.1 : Math.sin(t * 0.7) > 0.96 ? 0.15 : 1;
    if (leftEye.current) leftEye.current.scale.y = blink;
    if (rightEye.current) rightEye.current.scale.y = blink;
  });

  return (
    <group
      ref={root}
      onPointerMove={(e) => {
        pointer.current.x = THREE.MathUtils.clamp(e.point.x * 1.2, -1, 1);
        pointer.current.y = THREE.MathUtils.clamp(e.point.y * 1.2, -1, 1);
        if (dragging.current) {
          const x = THREE.MathUtils.clamp(
            e.point.x,
            HABITAT_BOUNDS.minX,
            HABITAT_BOUNDS.maxX,
          );
          const z = THREE.MathUtils.clamp(
            e.point.z,
            HABITAT_BOUNDS.minZ,
            HABITAT_BOUNDS.maxZ,
          );
          if (
            Math.hypot(x - dragStart.current.x, z - dragStart.current.z) > 0.05
          ) {
            dragStart.current.moved = true;
          }
          body.current = teleportBody(body.current, x, z);
          useMascotStore.getState().setPosition({ x, z });
        }
      }}
      onPointerDown={(e) => {
        e.stopPropagation();
        dragging.current = true;
        dragStart.current = {
          x: body.current.x,
          z: body.current.z,
          moved: false,
        };
      }}
      onPointerUp={(e) => {
        e.stopPropagation();
        if (!dragging.current) return;
        dragging.current = false;
        const moved =
          dragStart.current.moved ||
          Math.hypot(
            body.current.x - dragStart.current.x,
            body.current.z - dragStart.current.z,
          ) > 0.08;
        const now = Date.now();
        if (moved) {
          useMascotStore.getState().dispatch({
            type: "drag",
            x: body.current.x,
            z: body.current.z,
          });
          lastClick.current = 0;
        } else if (now - lastClick.current < 350) {
          useMascotStore.getState().dispatch({ type: "pet" });
          lastClick.current = 0;
        } else {
          useMascotStore.getState().dispatch({ type: "click" });
          lastClick.current = now;
        }
      }}
    >
      <group ref={pose}>
        <mesh position={[0, -0.35, 0]} castShadow>
          <capsuleGeometry args={[0.22, 0.28, 6, 12]} />
          <meshStandardMaterial
            color="#e8a598"
            roughness={0.45}
            metalness={0.05}
          />
        </mesh>

        <group ref={head} position={[0, 0.22, 0]}>
          <mesh castShadow>
            <sphereGeometry args={[0.42, 32, 32]} />
            <meshStandardMaterial color="#f5d0c8" roughness={0.4} />
          </mesh>
          <mesh ref={cheekL} position={[-0.22, -0.08, 0.32]}>
            <sphereGeometry args={[0.08, 12, 12]} />
            <meshStandardMaterial color="#f0a090" transparent opacity={0.55} />
          </mesh>
          <mesh ref={cheekR} position={[0.22, -0.08, 0.32]}>
            <sphereGeometry args={[0.08, 12, 12]} />
            <meshStandardMaterial color="#f0a090" transparent opacity={0.55} />
          </mesh>
          <mesh ref={leftEye} position={[-0.14, 0.06, 0.36]}>
            <sphereGeometry args={[0.07, 16, 16]} />
            <meshStandardMaterial color="#2a1810" />
          </mesh>
          <mesh ref={rightEye} position={[0.14, 0.06, 0.36]}>
            <sphereGeometry args={[0.07, 16, 16]} />
            <meshStandardMaterial color="#2a1810" />
          </mesh>
          <mesh position={[-0.12, 0.09, 0.42]}>
            <sphereGeometry args={[0.02, 8, 8]} />
            <meshStandardMaterial color="#fff" />
          </mesh>
          <mesh position={[0.16, 0.09, 0.42]}>
            <sphereGeometry args={[0.02, 8, 8]} />
            <meshStandardMaterial color="#fff" />
          </mesh>
          <mesh position={[0, -0.1, 0.38]} rotation={[0.2, 0, 0]}>
            <torusGeometry args={[0.06, 0.012, 8, 16, Math.PI]} />
            <meshStandardMaterial color="#c4786a" />
          </mesh>
          <mesh ref={tip} position={[0, 0.48, 0]}>
            <sphereGeometry args={[0.08, 12, 12]} />
            <meshStandardMaterial
              color="#f0a090"
              emissive="#f0a090"
              emissiveIntensity={0.45}
            />
          </mesh>
          <mesh position={[0, 0.38, 0]}>
            <cylinderGeometry args={[0.02, 0.02, 0.12, 8]} />
            <meshStandardMaterial color="#d4847a" />
          </mesh>
        </group>

        <mesh ref={leftArm} position={[-0.32, -0.28, 0]} rotation={[0, 0, 0.4]}>
          <capsuleGeometry args={[0.07, 0.16, 4, 8]} />
          <meshStandardMaterial color="#e8a598" />
        </mesh>
        <mesh
          ref={rightArm}
          position={[0.32, -0.28, 0]}
          rotation={[0, 0, -0.4]}
        >
          <capsuleGeometry args={[0.07, 0.16, 4, 8]} />
          <meshStandardMaterial color="#e8a598" />
        </mesh>
      </group>
    </group>
  );
}
