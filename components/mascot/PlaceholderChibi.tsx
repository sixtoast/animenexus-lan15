"use client";

import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { useMascotStore } from "@/lib/mascot/store";
import { HABITAT_BOUNDS } from "@/lib/mascot/types";
import { motionFromEmotions } from "@/lib/mascot/emotions";
import {
  expressionFromAnim,
  expressionFromEmotions,
} from "@/lib/mascot/expression";
import {
  applyJump,
  applyClimbJump,
  createBody,
  stepPhysics,
  steerToward,
  teleportBody,
  type PhysicsBody,
} from "@/lib/mascot/physics";
import { GltfCompanion } from "./GltfCompanion";

export function PlaceholderChibi() {
  const root = useRef<THREE.Group>(null);
  const facing = useRef(0);
  const decayAcc = useRef(0);
  const body = useRef<PhysicsBody>(createBody(0, 0));
  const wasAirborne = useRef(false);
  const justLanded = useRef(false);
  const dragging = useRef(false);
  const lastClick = useRef(0);
  const lastStorePos = useRef({ x: 0, z: 0 });
  const dragStart = useRef({ x: 0, z: 0, moved: false });
  const speedRef = useRef(0);

  useFrame((_state, delta) => {
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
      consumeJump,
    } = store;

    const motion = motionFromEmotions(emotions);
    justLanded.current = false;

    decayAcc.current += dt;
    if (decayAcc.current > 1) {
      decayEmotions(decayAcc.current);
      dispatch({ type: "tick" });
      decayAcc.current = 0;
    }

    const g = root.current;
    if (!g) return;

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
      justLanded.current = true;
      window.setTimeout(() => {
        if (useMascotStore.getState().anim === "land") setAnim("idle");
      }, 280);
    }
    wasAirborne.current = !body.current.onGround;

    setPosition({ x: body.current.x, z: body.current.z });

    speedRef.current = Math.hypot(body.current.vx, body.current.vz);

    g.position.x = body.current.x;
    g.position.z = body.current.z;
    g.position.y = -0.15 + body.current.y * 0.22;
    g.rotation.y = THREE.MathUtils.lerp(
      g.rotation.y,
      facing.current,
      1 - Math.pow(0.001, dt),
    );
  });

  const emotions = useMascotStore((s) => s.emotions);
  const anim = useMascotStore((s) => s.anim);
  const expression = expressionFromAnim(
    anim,
    expressionFromEmotions(emotions),
  );

  return (
    <group
      ref={root}
      onPointerMove={(e) => {
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
      <GltfCompanion
        expression={expression}
        anim={anim}
        yaw={facing.current}
        speed={speedRef.current}
        justLanded={justLanded.current}
      />
    </group>
  );
}
