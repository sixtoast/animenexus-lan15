"use client";

import { useFrame, useThree } from "@react-three/fiber";
import {
  useEffect,
  useRef,
  type MutableRefObject,
} from "react";
import * as THREE from "three";
import {
  getHomePlatform,
  pickWanderPlatform,
  planHops,
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
import {
  expressionFromAnim,
  expressionFromEmotions,
  sampleFace,
  type FacePose,
} from "@/lib/mascot/expression";

export type Phase = "home" | "outing" | "returning" | "perform";
export type MascotScreenPos = { x: number; y: number; visible: boolean };

function homeWorld(): { x: number; y: number } {
  if (typeof window === "undefined") return { x: 1.05, y: -0.72 };
  const aspect = window.innerWidth / (window.innerHeight || 1);
  return { x: Math.min(aspect * 0.78, 1.32), y: -0.72 };
}

/** Only these theatre events may pull the mascot out of a resting home pad. */
function isBreakoutTheatre(b: TheatreBeat | undefined): boolean {
  if (!b) return false;
  if (b.move === "climb-modal" || b.move === "inside-poster" || b.move === "inspect")
    return true;
  const intent = b.intent;
  return (
    intent === "curious" ||
    intent === "celebrate" ||
    intent === "point" ||
    intent === "shy_wave"
  );
}

function lerpFace(a: FacePose, b: FacePose, t: number): FacePose {
  const k = Math.max(0, Math.min(1, t));
  return {
    browL: a.browL + (b.browL - a.browL) * k,
    browR: a.browR + (b.browR - a.browR) * k,
    eyeOpen: a.eyeOpen + (b.eyeOpen - a.eyeOpen) * k,
    pupilX: a.pupilX + (b.pupilX - a.pupilX) * k,
    pupilY: a.pupilY + (b.pupilY - a.pupilY) * k,
    mouthOpen: a.mouthOpen + (b.mouthOpen - a.mouthOpen) * k,
    mouthWide: a.mouthWide + (b.mouthWide - a.mouthWide) * k,
    mouthCurve: a.mouthCurve + (b.mouthCurve - a.mouthCurve) * k,
    cheek: a.cheek + (b.cheek - a.cheek) * k,
    headTilt: a.headTilt + (b.headTilt - a.headTilt) * k,
  };
}

export function Actor({
  platforms,
  dragging,
  dragWorld,
  onScreenPos,
  bodyRef,
  phaseRef,
  lowPower,
}: {
  platforms: TerrainPlatform[];
  dragging: boolean;
  dragWorld: { x: number; y: number } | null;
  onScreenPos: (p: MascotScreenPos) => void;
  bodyRef: MutableRefObject<TerrainBody | null>;
  phaseRef: MutableRefObject<Phase>;
  lowPower: boolean;
}) {
  const root = useRef<THREE.Group>(null);
  const pose = useRef<THREE.Group>(null);
  const head = useRef<THREE.Group>(null);
  const tip = useRef<THREE.Mesh>(null);
  const tipStem = useRef<THREE.Mesh>(null);
  const eyeL = useRef<THREE.Group>(null);
  const eyeR = useRef<THREE.Group>(null);
  const pupilL = useRef<THREE.Mesh>(null);
  const pupilR = useRef<THREE.Mesh>(null);
  const browL = useRef<THREE.Mesh>(null);
  const browR = useRef<THREE.Mesh>(null);
  const mouth = useRef<THREE.Mesh>(null);
  const cheekL = useRef<THREE.Mesh>(null);
  const cheekR = useRef<THREE.Mesh>(null);
  const armL = useRef<THREE.Group>(null);
  const armR = useRef<THREE.Group>(null);
  const queue = useRef<TerrainPlatform[]>([]);
  const mood = useRef(worldMood());
  const homeUntil = useRef(0);
  const performUntil = useRef(0);
  const nextFreeHop = useRef(0);
  const nextRoam = useRef(0);
  const nextOuting = useRef(Date.now() + 20_000 + Math.random() * 12_000);
  const beat = useRef<TheatreBeat | null>(null);
  const facing = useRef(0);
  const seeded = useRef(false);
  const padWander = useRef(0);
  const faceSmooth = useRef<FacePose | null>(null);
  const emotions = useMascotStore((s) => s.emotions);
  const setAnim = useMascotStore((s) => s.setAnim);
  const anim = useMascotStore((s) => s.anim);
  const lookBias = useMascotStore((s) => s.lookBias);
  const { camera, size } = useThree();

  useEffect(() => {
    const h = homeWorld();
    if (!bodyRef.current) {
      bodyRef.current = createTerrainBody(h.x, h.y);
      bodyRef.current.onGround = true;
      bodyRef.current.platformId = "home-corner";
    }
    const home = getHomePlatform(platforms);
    if (home) {
      if (phaseRef.current === "home" || !seeded.current) {
        bodyRef.current = snapToPlatform(bodyRef.current, home);
        bodyRef.current.platformId = "home-corner";
        seeded.current = true;
      }
    }
  }, [platforms, bodyRef, phaseRef]);

  useEffect(() => {
    const id = window.setInterval(() => {
      mood.current = worldMood();
    }, 60_000);
    mood.current = worldMood();
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    const onTheatre = (e: Event) => {
      const b = (e as CustomEvent).detail as TheatreBeat;
      const now = Date.now();
      if (phaseRef.current === "home" && now < homeUntil.current) return;
      if (phaseRef.current === "home" && !isBreakoutTheatre(b)) return;

      beat.current = b;
      const openModal = platforms.find((p) => p.type === "modal");
      const dest =
        openModal ||
        pickWanderPlatform(platforms, bodyRef.current?.platformId ?? undefined);
      if (dest && bodyRef.current) {
        phaseRef.current = "outing";
        queue.current = planHops(
          platforms.find((x) => x.id === bodyRef.current!.platformId) ?? null,
          dest,
          platforms,
        );
        const first = queue.current[0];
        if (first) {
          bodyRef.current = jumpToward(bodyRef.current, first, true);
          setAnim("jump");
        }
      }
    };
    window.addEventListener("animenexus:mascot-theatre", onTheatre);
    return () =>
      window.removeEventListener("animenexus:mascot-theatre", onTheatre);
  }, [platforms, setAnim, bodyRef, phaseRef]);

  useFrame((state, delta) => {
    const dt = Math.min(delta, 0.05);
    const t = state.clock.elapsedTime;
    const motion = motionFromEmotions(emotions);
    const g = root.current;
    const p = pose.current;

    if (!bodyRef.current) {
      const h = homeWorld();
      bodyRef.current = createTerrainBody(h.x, h.y);
      bodyRef.current.onGround = true;
      bodyRef.current.platformId = "home-corner";
    }
    if (!g || !p) return;

    let body = bodyRef.current;
    const home = getHomePlatform(platforms) ?? null;
    const now = Date.now();
    const m = mood.current;
    const phase = phaseRef.current;
    const freed =
      phase === "outing" || phase === "returning" || phase === "perform";

    if (dragging && dragWorld) {
      body.x = dragWorld.x;
      body.y = dragWorld.y;
      body.vx = 0;
      body.vy = 0;
      body.onGround = false;
      body.platformId = null;
      body = clampToViewport(body);
      bodyRef.current = body;
      queue.current = [];
      phaseRef.current = "outing";
      setAnim("surprised");
      nextFreeHop.current = now + 500;
      nextRoam.current = now + 1000;
    } else if (phase === "home") {
      if (home) {
        padWander.current += dt;
        if (padWander.current > 3 + Math.random() * 2.5) {
          padWander.current = 0;
          const ox = (Math.random() - 0.5) * home.hw * 1.1;
          const oy = (Math.random() - 0.5) * home.hh * 0.7;
          body.x = home.x + ox;
          body.y = home.y + home.hh + oy;
        }
        const maxDx = home.hw * 0.95;
        const maxDy = home.hh * 0.9;
        body.x = THREE.MathUtils.clamp(body.x, home.x - maxDx, home.x + maxDx);
        body.y = THREE.MathUtils.clamp(
          body.y,
          home.y + home.hh - maxDy,
          home.y + home.hh + maxDy,
        );
        body.vx = 0;
        body.vy = 0;
        body.onGround = true;
        body.platformId = "home-corner";
        queue.current = [];
        bodyRef.current = body;
      }

      if (m.preferNap && anim !== "sleep" && Math.random() < 0.001) {
        setAnim("sleep");
      } else if (anim !== "sleep" && anim !== "idle") {
        setAnim("idle");
      }

      if (
        now > nextOuting.current &&
        now > homeUntil.current &&
        body.onGround &&
        !m.preferNap
      ) {
        const dest = pickWanderPlatform(platforms, "home-corner", false);
        if (dest && dest.id !== "home-corner") {
          phaseRef.current = "outing";
          beat.current = theatreForPlatform(dest);
          queue.current = planHops(home, dest, platforms);
          const first = queue.current[0];
          if (first && bodyRef.current) {
            bodyRef.current = jumpToward(bodyRef.current, first, true);
            setAnim("jump");
          }
          nextRoam.current = now + 2800 + Math.random() * 2000;
          nextFreeHop.current = now + 800;
        }
        nextOuting.current = now + outingIntervalMs(m, lowPower);
      }
    } else {
      if (phase === "perform" && now >= performUntil.current) {
        phaseRef.current = "outing";
        beat.current = null;
        homeUntil.current = now + 600;
        nextRoam.current = now + 500;
      }

      if (
        body.onGround &&
        queue.current.length === 0 &&
        now > nextFreeHop.current &&
        phaseRef.current === "outing"
      ) {
        if (Math.random() < 0.4) {
          bodyRef.current = freeHop(bodyRef.current);
          setAnim("jump");
          nextFreeHop.current = now + 900 + Math.random() * 1600;
        } else {
          nextFreeHop.current = now + 500 + Math.random() * 900;
        }
      }

      if (
        body.onGround &&
        queue.current.length === 0 &&
        phaseRef.current === "outing" &&
        now > nextRoam.current &&
        now > homeUntil.current
      ) {
        const dest = pickWanderPlatform(
          platforms,
          body.platformId ?? undefined,
          false,
        );
        if (dest && dest.id !== "home-corner") {
          beat.current = theatreForPlatform(dest);
          const current =
            platforms.find((x) => x.id === body.platformId) ?? null;
          queue.current = planHops(current, dest, platforms);
          const first = queue.current[0];
          if (first) {
            bodyRef.current = jumpToward(bodyRef.current, first, true);
            setAnim("jump");
          }
          nextRoam.current = now + 2800 + Math.random() * 3200;
        } else {
          if (home) {
            phaseRef.current = "returning";
            queue.current = planHops(
              platforms.find((x) => x.id === body.platformId) ?? null,
              home,
              platforms,
            );
            const first = queue.current[0];
            if (first && bodyRef.current) {
              bodyRef.current = jumpToward(bodyRef.current, first, true);
              setAnim("jump");
            }
          }
          nextRoam.current = now + 1200;
        }
      }

      if (
        (phaseRef.current === "outing" || phaseRef.current === "perform") &&
        queue.current.length === 0 &&
        body.onGround &&
        home
      ) {
        if (body.platformId !== "home-corner") {
          if (beat.current && phaseRef.current === "outing") {
            const tb = beat.current;
            const at = platforms.find((x) => x.id === body.platformId);
            if (at) {
              const pos = poseOnPlatform(at, tb.pose);
              body.x = pos.x;
              body.y = pos.y;
              body.vx = 0;
              body.vy = 0;
              body.onGround = true;
              bodyRef.current = clampToViewport(body);
            }
            setAnim(tb.anim);
            if (tb.thought) {
              window.dispatchEvent(
                new CustomEvent("animenexus:mascot-thought", {
                  detail: { text: tb.thought, intent: tb.intent },
                }),
              );
            }
            phaseRef.current = "perform";
            performUntil.current = now + tb.holdMs;
          } else if (homeUntil.current === 0) {
            homeUntil.current = now + lingerMs(m) * 1.4 + 1800;
          } else if (now > homeUntil.current) {
            phaseRef.current = "returning";
            beat.current = null;
            const current =
              platforms.find((x) => x.id === body.platformId) ?? null;
            queue.current = planHops(current, home, platforms);
            const first = queue.current[0];
            if (first && bodyRef.current) {
              bodyRef.current = jumpToward(bodyRef.current, first, true);
              setAnim("jump");
            }
            homeUntil.current = 0;
          }
        } else {
          phaseRef.current = "home";
          setAnim("idle");
          homeUntil.current = now + homeRestMs(m);
          nextOuting.current = now + outingIntervalMs(m, lowPower);
        }
      }

      if (
        phaseRef.current === "returning" &&
        queue.current.length === 0 &&
        (body.platformId === "home-corner" || !body.platformId)
      ) {
        phaseRef.current = "home";
        if (home) bodyRef.current = snapToPlatform(bodyRef.current, home);
        setAnim(m.preferNap ? "sleep" : "idle");
        homeUntil.current = now + homeRestMs(m);
        nextOuting.current = now + outingIntervalMs(m, lowPower);
        beat.current = null;
      }

      const goal = queue.current[0];
      if (goal) {
        const goalY = goal.y + goal.hh;
        if (body.onGround) {
          bodyRef.current = steerTerrain(
            bodyRef.current,
            goal.x,
            goalY,
            Math.max(0.7, motion.walkSpeed * 1.8),
            true,
          );
          if (anim !== "walk" && anim !== "jump") setAnim("walk");
        }
        if (
          Math.abs(bodyRef.current.x - goal.x) <
            Math.max(0.1, goal.hw * 0.8) &&
          Math.abs(bodyRef.current.y - goalY) < 0.25
        ) {
          bodyRef.current = snapToPlatform(bodyRef.current, goal);
          queue.current.shift();
          if (queue.current.length > 0) {
            const nxt = queue.current[0];
            bodyRef.current = jumpToward(bodyRef.current, nxt, true);
            setAnim("jump");
          } else if (!(beat.current && phaseRef.current === "outing")) {
            setAnim("happy");
            if (phaseRef.current === "outing") {
              homeUntil.current = Date.now() + lingerMs(m) * 1.4;
              nextFreeHop.current = Date.now() + 600;
            }
          }
        }
      }

      if (phaseRef.current !== "home" && phaseRef.current !== "perform") {
        bodyRef.current = stepTerrain(bodyRef.current, platforms, dt, true);
      }

      bodyRef.current = clampToViewport(bodyRef.current);
    }

    bodyRef.current = clampToViewport(bodyRef.current);
    const bSafe = bodyRef.current;
    const vb = viewportBounds(0.1);
    if (
      !dragging &&
      (bSafe.x < vb.minX - 0.05 ||
        bSafe.x > vb.maxX + 0.05 ||
        bSafe.y < vb.minY - 0.05 ||
        bSafe.y > vb.maxY + 0.05)
    ) {
      if (home) {
        bodyRef.current = snapToPlatform(bSafe, home);
        phaseRef.current = "home";
        queue.current = [];
        homeUntil.current = now + homeRestMs(m);
        nextOuting.current = now + outingIntervalMs(m, lowPower);
        setAnim("idle");
      } else {
        bodyRef.current = clampToViewport(bSafe, 0.15);
      }
    }

    const b = bodyRef.current;
    const proc = sampleProcedural(t, anim, motion, {
      onGround: b.onGround,
      vy: b.vy,
      lookX: lookBias.x,
      lookY: lookBias.y,
      phase: dragging
        ? "drag"
        : phaseRef.current === "perform" || phaseRef.current === "outing"
          ? "outing"
          : phaseRef.current === "returning"
            ? "returning"
            : "home",
    });

    // ── Sprint 2: layered expression (independent of locomotion) ──
    const emoExpr = expressionFromEmotions(emotions);
    const expr = expressionFromAnim(anim, emoExpr);
    const faceTarget = sampleFace(
      expr,
      t,
      lookBias.x,
      lookBias.y,
      proc.blink,
    );
    if (!faceSmooth.current) faceSmooth.current = faceTarget;
    else faceSmooth.current = lerpFace(faceSmooth.current, faceTarget, 0.18);
    const face = faceSmooth.current;

    let targetYaw = 0;
    if (Math.abs(b.vx) > 0.04) targetYaw = b.vx > 0 ? -0.38 : 0.38;
    if (dragging || phaseRef.current === "home") targetYaw = 0;
    facing.current = THREE.MathUtils.lerp(
      facing.current,
      targetYaw,
      freed ? 0.2 : 0.14,
    );
    g.rotation.y = facing.current;
    g.rotation.z = freed ? THREE.MathUtils.clamp(-b.vx * 0.04, -0.12, 0.12) : 0;

    g.position.set(b.x, b.y + 0.06 + proc.bob * (freed ? 1.1 : 0.6), 0.35);
    const s = 0.58;
    p.scale.set(proc.scaleX * s, proc.scaleY * s, s);

    if (head.current) {
      head.current.rotation.x = THREE.MathUtils.lerp(
        head.current.rotation.x,
        proc.headPitch + face.headTilt * 0.3,
        0.14,
      );
      head.current.rotation.y = THREE.MathUtils.lerp(
        head.current.rotation.y,
        proc.headYaw,
        0.14,
      );
      head.current.rotation.z = THREE.MathUtils.lerp(
        head.current.rotation.z,
        face.headTilt,
        0.12,
      );
    }

    // Eyes scale Y from expression open amount (blink already folded in)
    if (eyeL.current) eyeL.current.scale.y = Math.max(0.08, face.eyeOpen);
    if (eyeR.current) eyeR.current.scale.y = Math.max(0.08, face.eyeOpen);
    if (pupilL.current)
      pupilL.current.position.set(-0.012 + face.pupilX * 0.012, 0.005 + face.pupilY * 0.01, 0.012);
    if (pupilR.current)
      pupilR.current.position.set(0.012 + face.pupilX * 0.012, 0.005 + face.pupilY * 0.01, 0.012);

    // Brows
    if (browL.current) {
      browL.current.position.y = 0.055 + face.browL * 0.022;
      browL.current.rotation.z = 0.15 - face.browL * 0.25;
    }
    if (browR.current) {
      browR.current.position.y = 0.055 + face.browR * 0.022;
      browR.current.rotation.z = -0.15 + face.browR * 0.25;
    }

    // Mouth — scale + slight curve via rotation
    if (mouth.current) {
      mouth.current.scale.set(
        0.55 + face.mouthWide * 0.55,
        0.35 + face.mouthOpen * 0.9,
        1,
      );
      mouth.current.rotation.z = face.mouthCurve * -0.15;
      mouth.current.position.y = -0.035 - face.mouthOpen * 0.01;
    }

    // Cheeks blush opacity
    if (cheekL.current) {
      const mat = cheekL.current.material as THREE.MeshStandardMaterial;
      mat.opacity = 0.15 + face.cheek * 0.55;
    }
    if (cheekR.current) {
      const mat = cheekR.current.material as THREE.MeshStandardMaterial;
      mat.opacity = 0.15 + face.cheek * 0.55;
    }

    // Soft arm sway (Sprint 2 partial secondary)
    const armSwing =
      anim === "walk" && b.onGround
        ? Math.sin(t * (freed ? 14 : 10)) * 0.35
        : anim === "wave"
          ? Math.sin(t * 12) * 0.8
          : Math.sin(t * 1.4) * 0.08;
    if (armL.current) {
      armL.current.rotation.z = 0.35 + armSwing;
      armL.current.rotation.x = anim === "wave" ? -0.6 : 0.1;
    }
    if (armR.current) {
      armR.current.rotation.z = -0.35 - armSwing * (anim === "wave" ? 0.2 : 1);
      armR.current.rotation.x = anim === "point" ? -0.5 : 0.1;
    }

    // Tip emissive + stem sway
    if (tip.current) {
      const mat = tip.current.material as THREE.MeshStandardMaterial;
      mat.color.set(m.tipColor);
      mat.emissive.set(m.tipColor);
      mat.emissiveIntensity = Math.max(0.55, proc.tipPulse * m.emissive);
    }
    if (tipStem.current) {
      tipStem.current.rotation.z = Math.sin(t * 2.2) * 0.08;
    }

    const world = new THREE.Vector3(b.x, b.y + 0.1, 0.35);
    world.project(camera);
    let sx = (world.x * 0.5 + 0.5) * size.width;
    let sy = (-world.y * 0.5 + 0.5) * size.height;
    const pad = 40;
    sx = Math.max(pad, Math.min(size.width - pad, sx));
    sy = Math.max(pad, Math.min(size.height - pad, sy));
    onScreenPos({ x: sx, y: sy, visible: true });
  });

  const skin = "#f5d0c8";
  const skinDeep = "#e8a598";
  const blush = "#f0a090";
  const eyeDark = "#2a1810";
  const lip = "#c4786a";
  const brow = "#3a2418";

  return (
    <group ref={root}>
      <group ref={pose}>
        {/* Body */}
        <mesh position={[0, -0.12, 0]}>
          <capsuleGeometry args={[0.1, 0.12, 6, 12]} />
          <meshStandardMaterial
            color={skinDeep}
            roughness={0.4}
            metalness={0.06}
          />
        </mesh>
        {/* Soft foot pads */}
        <mesh position={[-0.05, -0.26, 0.02]} rotation={[0.3, 0, 0]}>
          <sphereGeometry args={[0.04, 10, 10]} />
          <meshStandardMaterial color={skinDeep} roughness={0.5} />
        </mesh>
        <mesh position={[0.05, -0.26, 0.02]} rotation={[0.3, 0, 0]}>
          <sphereGeometry args={[0.04, 10, 10]} />
          <meshStandardMaterial color={skinDeep} roughness={0.5} />
        </mesh>

        {/* Arms */}
        <group ref={armL} position={[-0.12, -0.06, 0]}>
          <mesh position={[0, -0.06, 0]}>
            <capsuleGeometry args={[0.032, 0.07, 4, 8]} />
            <meshStandardMaterial color={skin} roughness={0.4} />
          </mesh>
          <mesh position={[0, -0.12, 0]}>
            <sphereGeometry args={[0.038, 10, 10]} />
            <meshStandardMaterial color={skin} roughness={0.35} />
          </mesh>
        </group>
        <group ref={armR} position={[0.12, -0.06, 0]}>
          <mesh position={[0, -0.06, 0]}>
            <capsuleGeometry args={[0.032, 0.07, 4, 8]} />
            <meshStandardMaterial color={skin} roughness={0.4} />
          </mesh>
          <mesh position={[0, -0.12, 0]}>
            <sphereGeometry args={[0.038, 10, 10]} />
            <meshStandardMaterial color={skin} roughness={0.35} />
          </mesh>
        </group>

        {/* Head */}
        <group ref={head} position={[0, 0.14, 0]}>
          <mesh>
            <sphereGeometry args={[0.15, 24, 24]} />
            <meshStandardMaterial color={skin} roughness={0.32} metalness={0.04} />
          </mesh>

          {/* Eyes (sclera group scales for open/close) */}
          <group ref={eyeL} position={[-0.048, 0.022, 0.125]}>
            <mesh>
              <sphereGeometry args={[0.028, 12, 12]} />
              <meshStandardMaterial color="#fff8f4" roughness={0.25} />
            </mesh>
            <mesh ref={pupilL} position={[-0.012, 0.005, 0.012]}>
              <sphereGeometry args={[0.014, 10, 10]} />
              <meshStandardMaterial color={eyeDark} roughness={0.4} />
            </mesh>
            <mesh position={[-0.006, 0.01, 0.022]}>
              <sphereGeometry args={[0.005, 6, 6]} />
              <meshStandardMaterial color="#ffffff" emissive="#ffffff" emissiveIntensity={0.4} />
            </mesh>
          </group>
          <group ref={eyeR} position={[0.048, 0.022, 0.125]}>
            <mesh>
              <sphereGeometry args={[0.028, 12, 12]} />
              <meshStandardMaterial color="#fff8f4" roughness={0.25} />
            </mesh>
            <mesh ref={pupilR} position={[0.012, 0.005, 0.012]}>
              <sphereGeometry args={[0.014, 10, 10]} />
              <meshStandardMaterial color={eyeDark} roughness={0.4} />
            </mesh>
            <mesh position={[0.006, 0.01, 0.022]}>
              <sphereGeometry args={[0.005, 6, 6]} />
              <meshStandardMaterial color="#ffffff" emissive="#ffffff" emissiveIntensity={0.4} />
            </mesh>
          </group>

          {/* Brows */}
          <mesh ref={browL} position={[-0.05, 0.055, 0.13]} rotation={[0, 0, 0.15]}>
            <boxGeometry args={[0.045, 0.008, 0.008]} />
            <meshStandardMaterial color={brow} roughness={0.6} />
          </mesh>
          <mesh ref={browR} position={[0.05, 0.055, 0.13]} rotation={[0, 0, -0.15]}>
            <boxGeometry args={[0.045, 0.008, 0.008]} />
            <meshStandardMaterial color={brow} roughness={0.6} />
          </mesh>

          {/* Mouth */}
          <mesh ref={mouth} position={[0, -0.035, 0.13]}>
            <sphereGeometry args={[0.022, 10, 8]} />
            <meshStandardMaterial color={lip} roughness={0.45} />
          </mesh>

          {/* Cheeks */}
          <mesh ref={cheekL} position={[-0.085, -0.015, 0.1]}>
            <sphereGeometry args={[0.03, 8, 8]} />
            <meshStandardMaterial color={blush} transparent opacity={0.35} depthWrite={false} />
          </mesh>
          <mesh ref={cheekR} position={[0.085, -0.015, 0.1]}>
            <sphereGeometry args={[0.03, 8, 8]} />
            <meshStandardMaterial color={blush} transparent opacity={0.35} depthWrite={false} />
          </mesh>

          {/* Lantern tip stem + flame */}
          <mesh ref={tipStem} position={[0, 0.145, 0]}>
            <cylinderGeometry args={[0.008, 0.012, 0.04, 6]} />
            <meshStandardMaterial color="#d4a090" roughness={0.5} />
          </mesh>
          <mesh ref={tip} position={[0, 0.18, 0]}>
            <sphereGeometry args={[0.038, 12, 12]} />
            <meshStandardMaterial
              color="#f0a090"
              emissive="#f0a090"
              emissiveIntensity={0.9}
              roughness={0.35}
            />
          </mesh>
        </group>
      </group>
    </group>
  );
}
