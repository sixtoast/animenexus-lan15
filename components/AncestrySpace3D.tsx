"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { AnimeRelation } from "@/lib/types";

type NodeSpec = {
  id: number;
  title: string;
  image?: string;
  kind: "center" | "official" | "recommended";
  relationType: string;
  year?: number | string | null;
  score?: number | null;
};

type Props = {
  center: NodeSpec;
  nodes: NodeSpec[];
};

declare global {
  interface Window {
    THREE?: any;
  }
}

function loadThree(): Promise<any> {
  return new Promise((resolve, reject) => {
    if (window.THREE) {
      resolve(window.THREE);
      return;
    }
    const existing = document.querySelector(
      "script[data-three-js]",
    ) as HTMLScriptElement | null;
    if (existing) {
      existing.addEventListener("load", () => resolve(window.THREE));
      existing.addEventListener("error", () => reject(new Error("three load")));
      return;
    }
    const s = document.createElement("script");
    s.src = "https://unpkg.com/three@0.160.0/build/three.min.js";
    s.async = true;
    s.dataset.threeJs = "1";
    s.onload = () => resolve(window.THREE);
    s.onerror = () => reject(new Error("three failed"));
    document.body.appendChild(s);
  });
}

function ringRadius(kind: NodeSpec["kind"], i: number, n: number) {
  if (kind === "official") return 4.2 + (i % 3) * 0.35;
  return 7.2 + (i % 4) * 0.4;
}

function edgeColor(kind: NodeSpec["kind"], relationType: string) {
  const t = relationType.toUpperCase();
  if (kind === "recommended") return 0xf0a090;
  if (t === "SEQUEL") return 0x8fd4a0;
  if (t === "PREQUEL" || t === "PARENT") return 0x8ab0e8;
  if (t === "SIDE_STORY") return 0xefc07a;
  if (t === "SPIN_OFF") return 0xc9a0e8;
  return 0xd4a090;
}

export function AncestrySpace3D({ center, nodes }: Props) {
  const hostRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const [hud, setHud] = useState<{ title: string; meta: string } | null>(null);
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  const [hint, setHint] = useState("Drag to orbit · scroll to zoom · click a poster");

  useEffect(() => {
    if (!hostRef.current || !nodes.length) return;
    let disposed = false;
    let frame = 0;
    let renderer: any;
    let scene: any;
    let camera: any;
    let controls = {
      theta: 0.4,
      phi: 1.15,
      radius: 14,
      dragging: false,
      lx: 0,
      ly: 0,
    };

    const pickables: { mesh: any; spec: NodeSpec }[] = [];

    loadThree()
      .then((THREE) => {
        if (disposed || !hostRef.current) return;

        const el = hostRef.current;
        const w = el.clientWidth || 640;
        const h = el.clientHeight || 420;

        scene = new THREE.Scene();
        scene.fog = new THREE.FogExp2(0x0a0807, 0.028);

        camera = new THREE.PerspectiveCamera(50, w / h, 0.1, 80);
        camera.position.set(0, 3, 14);

        renderer = new THREE.WebGLRenderer({
          antialias: true,
          alpha: true,
          powerPreference: "high-performance",
        });
        renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
        renderer.setSize(w, h);
        renderer.setClearColor(0x000000, 0);
        el.appendChild(renderer.domElement);

        // Soft ambient + lantern key light
        scene.add(new THREE.AmbientLight(0xffe8d8, 0.55));
        const key = new THREE.PointLight(0xf0a090, 2.2, 40);
        key.position.set(0, 2, 2);
        scene.add(key);
        const fill = new THREE.PointLight(0x6a90c8, 0.6, 30);
        fill.position.set(-6, -2, -4);
        scene.add(fill);

        // Star dust
        const dustGeo = new THREE.BufferGeometry();
        const dustCount = 400;
        const dustPos = new Float32Array(dustCount * 3);
        for (let i = 0; i < dustCount; i++) {
          dustPos[i * 3] = (Math.random() - 0.5) * 40;
          dustPos[i * 3 + 1] = (Math.random() - 0.5) * 24;
          dustPos[i * 3 + 2] = (Math.random() - 0.5) * 40;
        }
        dustGeo.setAttribute("position", new THREE.BufferAttribute(dustPos, 3));
        const dust = new THREE.Points(
          dustGeo,
          new THREE.PointsMaterial({
            color: 0xf0c8b0,
            size: 0.04,
            transparent: true,
            opacity: 0.55,
            depthWrite: false,
          }),
        );
        scene.add(dust);

        // Ground ring (aesthetic)
        const ring = new THREE.Mesh(
          new THREE.RingGeometry(3.5, 9.5, 64),
          new THREE.MeshBasicMaterial({
            color: 0xf0a090,
            transparent: true,
            opacity: 0.06,
            side: THREE.DoubleSide,
          }),
        );
        ring.rotation.x = -Math.PI / 2;
        ring.position.y = -1.8;
        scene.add(ring);

        const loader = new THREE.TextureLoader();
        loader.crossOrigin = "anonymous";

        function makePoster(spec: NodeSpec, scale: number) {
          const group = new THREE.Group();
          const plane = new THREE.Mesh(
            new THREE.PlaneGeometry(1 * scale, 1.5 * scale),
            new THREE.MeshStandardMaterial({
              color: 0x2a2220,
              roughness: 0.7,
              metalness: 0.1,
              emissive: 0x1a1010,
              emissiveIntensity: 0.15,
            }),
          );
          group.add(plane);

          // Glow frame
          const frame = new THREE.Mesh(
            new THREE.PlaneGeometry(1.08 * scale, 1.58 * scale),
            new THREE.MeshBasicMaterial({
              color: edgeColor(spec.kind, spec.relationType),
              transparent: true,
              opacity: spec.kind === "center" ? 0.45 : 0.22,
              side: THREE.DoubleSide,
            }),
          );
          frame.position.z = -0.02;
          group.add(frame);

          if (spec.image) {
            loader.load(
              spec.image,
              (tex: any) => {
                tex.colorSpace = THREE.SRGBColorSpace;
                plane.material.map = tex;
                plane.material.color.set(0xffffff);
                plane.material.emissiveIntensity = 0.05;
                plane.material.needsUpdate = true;
              },
              undefined,
              () => {},
            );
          }

          (group as any).userData = { spec, plane };
          return group;
        }

        // Center node
        const centerMesh = makePoster(center, 1.55);
        centerMesh.position.set(0, 0.4, 0);
        scene.add(centerMesh);
        pickables.push({ mesh: centerMesh, spec: center });

        // Soft halo under center
        const halo = new THREE.Mesh(
          new THREE.CircleGeometry(1.4, 32),
          new THREE.MeshBasicMaterial({
            color: 0xf0a090,
            transparent: true,
            opacity: 0.18,
            side: THREE.DoubleSide,
          }),
        );
        halo.rotation.x = -Math.PI / 2;
        halo.position.y = -1.6;
        scene.add(halo);

        const lineMatBase = {
          transparent: true,
          opacity: 0.55,
          depthWrite: false,
        };

        const official = nodes.filter((n) => n.kind === "official");
        const recommended = nodes.filter((n) => n.kind === "recommended");

        function placeRing(list: NodeSpec[], baseY: number) {
          list.forEach((spec, i) => {
            const n = list.length || 1;
            const angle = (i / n) * Math.PI * 2 + (spec.kind === "recommended" ? 0.3 : 0);
            const r = ringRadius(spec.kind, i, n);
            const mesh = makePoster(spec, spec.kind === "official" ? 0.95 : 0.78);
            mesh.position.set(
              Math.cos(angle) * r,
              baseY + Math.sin(i * 1.7) * 0.35,
              Math.sin(angle) * r,
            );
            // Face center-ish
            mesh.lookAt(0, mesh.position.y, 0);
            mesh.rotateY(Math.PI);
            scene.add(mesh);
            pickables.push({ mesh, spec });

            // Connection line to center
            const points = [
              new THREE.Vector3(0, 0.2, 0),
              new THREE.Vector3(
                mesh.position.x * 0.5,
                mesh.position.y * 0.6 + 0.5,
                mesh.position.z * 0.5,
              ),
              mesh.position.clone(),
            ];
            const curve = new THREE.CatmullRomCurve3(points);
            const tube = new THREE.Mesh(
              new THREE.TubeGeometry(curve, 24, 0.015, 5, false),
              new THREE.MeshBasicMaterial({
                color: edgeColor(spec.kind, spec.relationType),
                ...lineMatBase,
                opacity: spec.kind === "recommended" ? 0.28 : 0.5,
              }),
            );
            scene.add(tube);
          });
        }

        placeRing(official, 0.2);
        placeRing(recommended, -0.4);

        const raycaster = new THREE.Raycaster();
        const pointer = new THREE.Vector2();
        let hovered: any = null;

        function updateCamera() {
          const { theta, phi, radius } = controls;
          camera.position.x = radius * Math.sin(phi) * Math.sin(theta);
          camera.position.y = radius * Math.cos(phi);
          camera.position.z = radius * Math.sin(phi) * Math.cos(theta);
          camera.lookAt(0, 0.2, 0);
        }
        updateCamera();

        function onPointerDown(e: PointerEvent) {
          controls.dragging = true;
          controls.lx = e.clientX;
          controls.ly = e.clientY;
          el.setPointerCapture(e.pointerId);
        }
        function onPointerUp(e: PointerEvent) {
          controls.dragging = false;
          try {
            el.releasePointerCapture(e.pointerId);
          } catch {
            /* ignore */
          }
        }
        function onPointerMove(e: PointerEvent) {
          const rect = el.getBoundingClientRect();
          pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
          pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

          if (controls.dragging) {
            const dx = e.clientX - controls.lx;
            const dy = e.clientY - controls.ly;
            controls.lx = e.clientX;
            controls.ly = e.clientY;
            controls.theta -= dx * 0.008;
            controls.phi = Math.max(
              0.35,
              Math.min(1.55, controls.phi + dy * 0.008),
            );
            updateCamera();
            return;
          }

          raycaster.setFromCamera(pointer, camera);
          const hits = raycaster.intersectObjects(
            pickables.map((p) => p.mesh),
            true,
          );
          let found: { mesh: any; spec: NodeSpec } | null = null;
          if (hits.length) {
            let obj = hits[0].object;
            while (obj && !(obj as any).userData?.spec) obj = obj.parent;
            if (obj?.userData?.spec) {
              found =
                pickables.find((p) => p.mesh === obj) ||
                ({ mesh: obj, spec: obj.userData.spec } as any);
            }
          }
          if (found?.spec) {
            el.style.cursor = found.spec.kind === "center" ? "default" : "pointer";
            const meta = [
              found.spec.relationType !== "CENTER"
                ? found.spec.relationType.replace(/_/g, " ")
                : "Current",
              found.spec.year ? String(found.spec.year) : null,
              found.spec.score != null
                ? `★ ${found.spec.score.toFixed(1)}`
                : null,
            ]
              .filter(Boolean)
              .join(" · ");
            setHud({ title: found.spec.title, meta });
            if (hovered && hovered !== found.mesh) {
              hovered.scale.set(1, 1, 1);
            }
            found.mesh.scale.set(1.08, 1.08, 1.08);
            hovered = found.mesh;
          } else {
            el.style.cursor = controls.dragging ? "grabbing" : "grab";
            setHud(null);
            if (hovered) {
              hovered.scale.set(1, 1, 1);
              hovered = null;
            }
          }
        }
        function onClick(e: MouseEvent) {
          if (Math.abs(e.movementX) + Math.abs(e.movementY) > 4) return;
          const rect = el.getBoundingClientRect();
          pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
          pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
          raycaster.setFromCamera(pointer, camera);
          const hits = raycaster.intersectObjects(
            pickables.map((p) => p.mesh),
            true,
          );
          if (!hits.length) return;
          let obj = hits[0].object;
          while (obj && !(obj as any).userData?.spec) obj = obj.parent;
          const spec = obj?.userData?.spec as NodeSpec | undefined;
          if (spec && spec.kind !== "center") {
            router.push(`/anime/${spec.id}`);
          }
        }
        function onWheel(e: WheelEvent) {
          e.preventDefault();
          controls.radius = Math.max(
            7,
            Math.min(22, controls.radius + e.deltaY * 0.01),
          );
          updateCamera();
        }

        el.addEventListener("pointerdown", onPointerDown);
        el.addEventListener("pointerup", onPointerUp);
        el.addEventListener("pointermove", onPointerMove);
        el.addEventListener("click", onClick);
        el.addEventListener("wheel", onWheel, { passive: false });
        el.style.cursor = "grab";

        const onResize = () => {
          if (!hostRef.current) return;
          const nw = hostRef.current.clientWidth;
          const nh = hostRef.current.clientHeight;
          camera.aspect = nw / nh;
          camera.updateProjectionMatrix();
          renderer.setSize(nw, nh);
        };
        window.addEventListener("resize", onResize);

        const clock = new THREE.Clock();
        const animate = () => {
          if (disposed) return;
          frame = requestAnimationFrame(animate);
          const t = clock.getElapsedTime();
          if (!controls.dragging) {
            controls.theta += 0.0012;
            updateCamera();
          }
          dust.rotation.y = t * 0.02;
          halo.material.opacity = 0.12 + Math.sin(t * 1.5) * 0.05;
          // Billboards: keep posters upright-ish toward camera
          for (const p of pickables) {
            if (p.spec.kind === "center") continue;
            p.mesh.quaternion.copy(camera.quaternion);
          }
          centerMesh.position.y = 0.4 + Math.sin(t * 0.8) * 0.08;
          renderer.render(scene, camera);
        };
        animate();
        setReady(true);
        setHint("Drag to orbit · scroll to zoom · click a poster to open");

        return () => {
          el.removeEventListener("pointerdown", onPointerDown);
          el.removeEventListener("pointerup", onPointerUp);
          el.removeEventListener("pointermove", onPointerMove);
          el.removeEventListener("click", onClick);
          el.removeEventListener("wheel", onWheel);
          window.removeEventListener("resize", onResize);
        };
      })
      .catch(() => setFailed(true));

    return () => {
      disposed = true;
      cancelAnimationFrame(frame);
      if (renderer) {
        renderer.dispose();
        if (hostRef.current && renderer.domElement?.parentNode) {
          renderer.domElement.parentNode.removeChild(renderer.domElement);
        }
      }
    };
  }, [center, nodes, router]);

  if (failed) {
    return (
      <p className="tools-hint">
        3D view unavailable in this browser — use the lists below.
      </p>
    );
  }

  return (
    <div className="ab3-shell">
      <div ref={hostRef} className="ab3-canvas" role="img" aria-label="3D ancestry constellation" />
      <div className="ab3-hud">
        {hud ? (
          <>
            <strong>{hud.title}</strong>
            <span>{hud.meta}</span>
          </>
        ) : (
          <span className="ab3-hint">{ready ? hint : "Igniting constellation…"}</span>
        )}
      </div>
      <div className="ab3-legend">
        <span className="ab3-leg ab3-leg-off">Official links</span>
        <span className="ab3-leg ab3-leg-rec">Similar / recommended</span>
      </div>
    </div>
  );
}
