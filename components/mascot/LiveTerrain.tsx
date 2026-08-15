"use client";

/**
 * 3D companion host — calm in home pad; freer when out but always on-screen & reachable.
 * Sprint 21: throttled terrain rebuilds, no per-scroll full scan spam, pause when tab hidden.
 */

import { Canvas, useThree } from "@react-three/fiber";
import {
  useEffect,
  useMemo,
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
import { LIVE_LIGHTING, PALETTE, CANVAS_GL } from "@/lib/mascot/visual";
import {
  budgetFor,
  detectPerfTier,
  isPageActive,
  noteTerrainBuild,
  shouldDeepIdle,
  throttle,
} from "@/lib/mascot/performance";
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
          color={PALETTE.padFill}
          transparent
          opacity={0.1}
          depthWrite={false}
        />
      </mesh>
      <lineSegments>
        <edgesGeometry args={[new THREE.PlaneGeometry(w, h)]} />
        <lineBasicMaterial
          color={PALETTE.padEdge}
          transparent
          opacity={0.65}
        />
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
  const [pageActive, setPageActive] = useState(true);
  const bodyRef = useRef<TerrainBody | null>(null);
  const phaseRef = useRef<Phase>("home");
  const dragMoved = useRef(false);

  const budget = useMemo(
    () => budgetFor(detectPerfTier({ lowPower })),
    [lowPower],
  );

  const home = platforms.find((p) => p.id === "home-corner") ?? null;

  // Pause work when tab is hidden
  useEffect(() => {
    const onVis = () => setPageActive(isPageActive());
    onVis();
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, []);

  // Terrain rebuild: throttled scroll, slower idle interval, skip when hidden
  useEffect(() => {
    if (!pageActive) return;

    const rebuild = () => {
      if (!isPageActive()) return;
      const t0 = performance.now();
      try {
        setPlatforms(buildTerrain());
      } catch (err) {
        console.warn("[Lantern-ko] terrain rebuild failed", err);
      }
      noteTerrainBuild(performance.now() - t0);
    };

    const scrollRebuild = throttle(rebuild, budget.terrainScrollMs);

    const t0 = window.setTimeout(rebuild, 40);
    const t1 = window.setTimeout(rebuild, 280);
    const t2 = window.setTimeout(rebuild, 900);

    let idleMs = budget.terrainIdleMs;
    const tickIdle = () => {
      const s = useMascotStore.getState();
      const deep = shouldDeepIdle({
        anim: s.anim,
        intention: s.intention,
        msSinceInteract: Date.now() - s.lastInteractionAt,
      });
      idleMs = deep ? budget.terrainIdleMs * 1.8 : budget.terrainIdleMs;
      rebuild();
    };
    const id = window.setInterval(tickIdle, idleMs);

    window.addEventListener("resize", scrollRebuild);
    window.addEventListener("scroll", scrollRebuild, { passive: true });

    return () => {
      window.clearTimeout(t0);
      window.clearTimeout(t1);
      window.clearTimeout(t2);
      window.clearInterval(id);
      scrollRebuild.cancel();
      window.removeEventListener("resize", scrollRebuild);
      window.removeEventListener("scroll", scrollRebuild);
    };
  }, [pageActive, budget.terrainIdleMs, budget.terrainScrollMs]);

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

  const L = LIVE_LIGHTING;
  const dprMax = budget.dprMax;

  return (
    <>
      <div className="mascot-home-pad" aria-hidden />

      <div className="live-terrain" aria-hidden>
        <Canvas
          className="live-terrain-canvas"
          orthographic
          dpr={[1, dprMax]}
          gl={budget.antialias ? CANVAS_GL.full : CANVAS_GL.lowPower}
          frameloop={pageActive ? "always" : "never"}
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
          <ambientLight intensity={L.ambient.intensity} color={L.ambient.color} />
          <directionalLight
            position={L.key.position}
            intensity={L.key.intensity}
            color={L.key.color}
          />
          <directionalLight
            position={L.fill.position}
            intensity={L.fill.intensity}
            color={L.fill.color}
          />
          <pointLight
            position={L.rim.position}
            intensity={L.rim.intensity}
            distance={L.rim.distance}
            color={L.rim.color}
          />
          <HomePadBox home={home} />
          <Actor
            platforms={platforms}
            dragging={dragging}
            dragWorld={dragWorld}
            onScreenPos={setScreenPos}
            bodyRef={bodyRef}
            phaseRef={phaseRef}
            lowPower={budget.tier === "low"}
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
