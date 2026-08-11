"use client";

/**
 * 3D companion — calm in home pad; freer when out but always on-screen & reachable.
 * Safety: idle home never auto-climbs on scroll; clamp every frame; return-home guaranteed.
 */

import { Canvas, useFrame, useThree } from "@react-three/fiber";
import {
  useEffect,
  useRef,
  useState,
  useCallback,
  type MutableRefObject,
} from "react";
import * as THREE from "three";
import {
  buildTerrain,
  getHomePlatform,
  pickWanderPlatform,
  planHops,
  screenToWorld,
  type TerrainPlatform,
} from "@/lib/mascot/page-terrain";
import {
  createTerrainBody,
  jumpToward,
  snapToPlatform,
  stepTerrain,
  steerTerrain,
  freeHop,
  clampToViewport,
  viewportBounds,
  type TerrainBody,
} from "@/lib/mascot/terrain-physics";
import { useMascotStore } from "@/lib/mascot/store";
import { motionFromEmotions } from "@/lib/mascot/emotions";
import {
  worldMood,
  lingerMs,
  homeRestMs,
  outingIntervalMs,
} from "@/lib/mascot/living-world";
import { sampleProcedural } from "@/lib/mascot/procedural-motion";
import {
  poseOnPlatform,
  theatreForPlatform,
  type TheatreBeat,
} from "@/lib/mascot/ui-theatre";

type Phase = "home" | "outing" | "returning" | "perform";

export type MascotScreenPos = { x: number; y: number; visible: boolean };

function homeWorld(): { x: number; y: number } {
  if (typeof window === "undefined") return { x: 1.05, y: -0.72 };
  const aspect = window.innerWidth / (window.innerHeight || 1);
  return { x: Math.min(aspect * 0.78, 1.32), y: -0.72 };
}

function OrthoCamera() {
  const { camera, size } = useThree();
  useEffect(() => {
    const cam = camera as THREE.OrthographicCamera;
    const aspect = size.width / Math.max(size.height, 1);
    cam.left = -aspect;
    cam.right = aspect;
    cam.top = 1;
    cam.bottom = -1;
    cam.near = 0.1;
    cam.far = 20;
    cam.position.set(0, 0, 5);
    cam.lookAt(0, 0, 0);
    cam.updateProjectionMatrix();
  }, [camera, size]);
  return null;
}

function HomePadBox({ home }: { home: TerrainPlatform | null }) {
  if (!home) return null;
  const w = home.hw * 2;
  const h = home.hh * 2.2;
  return (
    <group position={[home.x, home.y + home.hh, 0.05]}>
      <mesh>
        <planeGeometry args={[w, h]} />
        <meshBasicMaterial
          color="#f0a090"
          transparent
          opacity={0.08}
          depthWrite={false}
        />
      </mesh>
      <lineSegments>
        <edgesGeometry args={[new THREE.PlaneGeometry(w, h)]} />
        <lineBasicMaterial color="#f0a090" transparent opacity={0.55} />
      </lineSegments>
    </group>
  );
}
