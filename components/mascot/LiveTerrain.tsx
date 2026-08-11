"use client";

/**
 * 3D companion host — calm in home pad; freer when out but always on-screen & reachable.
 * Safety: idle home never auto-climbs on scroll; clamp every frame; return-home guaranteed.
 */

import { Canvas, useThree } from "@react-three/fiber";
import {
  useEffect,
  useRef,
  useState,
  useCallback,
} from "react";
import * as THREE from "three";
import {
  buildTerrain,
  getHomePlatform,
  screenToWorld,
  type TerrainPlatform,
} from "@/lib/mascot/page-terrain";
import {
  clampToViewport,
  jumpToward,
  snapToPlatform,
  type TerrainBody,
} from "@/lib/mascot/terrain-physics";
import { useMascotStore } from "@/lib/mascot/store";
import { Actor, type Phase, type MascotScreenPos } from "./Actor";

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

type Props = {
  reducedMotion?: boolean;
  lowPower?: boolean;
};

export function LiveTerrain({ reducedMotion, lowPower = false }: Props) {
  const [platforms, setPlatforms] = useState<TerrainPlatform[]>([]);
  const [screenPos, setScreenPos] = useState<MascotScreenPos>({
    x: 0,
    y: 0,
    visible: false,
  });
  const [dragging, setDragging] = useState(false);
  const [dragWorld, setDragWorld] = useState<{ x: number; y: number } | null>(
    null,
  );
  const [glError, setGlError] = useState<string | null>(null);
  const bodyRef = useRef<TerrainBody | null>(null);
  const phaseRef = useRef<Phase>("home");
  const dragMoved = useRef(false);

  const home = platforms.find((p) => p.id === "home-corner") ?? null;

  useEffect(() => {
    const rebuild = () => {
      try {
        setPlatforms(buildTerrain());
      } catch (err) {
        console.warn("[Lantern-ko] terrain rebuild failed", err);
      }
    };
    const t0 = window.setTimeout(rebuild, 40);
    const t1 = window.setTimeout(rebuild, 250);
    const t2 = window.setTimeout(rebuild, 800);
    // Scroll rebuilds terrain only — must not change phase (home lock owns that)
    const id = window.setInterval(rebuild, lowPower ? 2500 : 1800);
    window.addEventListener("resize", rebuild);
    window.addEventListener("scroll", rebuild, { passive: true });
    return () => {
      window.clearTimeout(t0);
      window.clearTimeout(t1);
      window.clearTimeout(t2);
      window.clearInterval(id);
      window.removeEventListener("resize", rebuild);
      window.removeEventListener("scroll", rebuild);
    };
  }, [lowPower]);

  const onPointerDown = useCallback((e: React.PointerEvent) => {
    e.preventDefault();
    e.stopPropagation();
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
    dragMoved.current = false;
    setDragging(true);
    setDragWorld(screenToWorld(e.clientX, e.clientY));
  }, []);

  const onPointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!dragging) return;
      e.preventDefault();
      dragMoved.current = true;
      setDragWorld(screenToWorld(e.clientX, e.clientY));
    },
    [dragging],
  );

  const onPointerUp = useCallback(
    (e: React.PointerEvent) => {
      e.preventDefault();
      setDragging(false);
      const w = screenToWorld(e.clientX, e.clientY);
      setDragWorld(null);
      if (!bodyRef.current) return;

      if (!dragMoved.current) {
        useMascotStore.getState().dispatch({ type: "click" });
        const h = getHomePlatform(platforms);
        if (h && phaseRef.current === "home") {
          bodyRef.current = snapToPlatform(bodyRef.current, h);
        }
        return;
      }

      let best: TerrainPlatform | null = null;
      let bestD = 0.35;
      for (const p of platforms) {
        if (p.type === "floor" || p.type === "home") continue;
        if (
          p.clientX < 48 ||
          p.clientX > window.innerWidth - 48 ||
          p.clientY < 48 ||
          p.clientY > window.innerHeight - 48
        )
          continue;
        const d = Math.hypot(w.x - p.x, w.y - (p.y + p.hh));
        if (d < bestD) {
          bestD = d;
          best = p;
        }
      }

      phaseRef.current = "outing";
      if (best) {
        bodyRef.current = clampToViewport({
          ...bodyRef.current,
          x: w.x,
          y: w.y,
          vx: (best.x - w.x) * 0.5,
          vy: 0.9,
          onGround: false,
          platformId: null,
        });
        bodyRef.current = jumpToward(bodyRef.current, best, true);
      } else {
        bodyRef.current = clampToViewport({
          ...bodyRef.current,
          x: w.x,
          y: w.y,
          vx: (Math.random() - 0.5) * 0.6,
          vy: 1.2,
          onGround: false,
          platformId: null,
        });
      }
      useMascotStore.getState().dispatch({ type: "pet" });
    },
    [platforms],
  );

  if (reducedMotion) return null;

  if (glError) {
    return (
      <div className="mascot-error" role="alert">
        <strong>3D companion failed</strong>
        <p>{glError}</p>
        <button
          type="button"
          className="mascot-error-retry"
          onClick={() => {
            setGlError(null);
            window.location.reload();
          }}
        >
          Reload
        </button>
      </div>
    );
  }

  return (
    <>
      <div className="mascot-home-pad" aria-hidden />

      <div className="live-terrain" aria-hidden>
        <Canvas
          className="live-terrain-canvas"
          orthographic
          dpr={lowPower ? [1, 1.5] : [1, 2]}
          gl={{
            alpha: true,
            antialias: true,
            powerPreference: "high-performance",
            failIfMajorPerformanceCaveat: false,
            premultipliedAlpha: true,
          }}
          frameloop="always"
          camera={{
            position: [0, 0, 5],
            zoom: 1,
            near: 0.1,
            far: 20,
          }}
          style={{ pointerEvents: "none", width: "100%", height: "100%" }}
          onCreated={({ gl }) => {
            gl.setClearColor(0x000000, 0);
            if (!gl.getContext()) {
              setGlError("WebGL context lost after Canvas create.");
            }
          }}
          onError={(err) => {
            console.error("[Lantern-ko] Canvas error", err);
            setGlError(
              err instanceof Error ? err.message : "Canvas failed to initialize",
            );
          }}
        >
          <OrthoCamera />
          <ambientLight intensity={1.15} />
          <directionalLight position={[2.5, 3.5, 5]} intensity={1.0} />
          <directionalLight position={[-2, 1, 3]} intensity={0.4} />
          <pointLight
            position={[1.0, -0.3, 2]}
            intensity={0.7}
            distance={5}
            color="#f0a090"
          />
          <HomePadBox home={home} />
          <Actor
            platforms={platforms}
            dragging={dragging}
            dragWorld={dragWorld}
            onScreenPos={setScreenPos}
            bodyRef={bodyRef}
            phaseRef={phaseRef}
            lowPower={lowPower}
          />
        </Canvas>
      </div>
      {screenPos.visible ? (
        <button
          type="button"
          className={
            "mascot-drag-handle" +
            (dragging ? " mascot-drag-handle--active" : "")
          }
          style={{ left: screenPos.x, top: screenPos.y }}
          aria-label="Drag Lantern-ko"
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
        />
      ) : null}
    </>
  );
}
