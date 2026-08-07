"use client";

import { Suspense, useEffect, useState } from "react";
import { useGLTF } from "@react-three/drei";
import { PlaceholderChibi } from "./PlaceholderChibi";

/**
 * Optional GLTF body. Place a model at /public/mascot/companion.glb
 * (Y-up, ~1 unit tall preferred). Falls back to procedural chibi.
 */
const GLTF_URL = "/mascot/companion.glb";

function GltfMesh({ url }: { url: string }) {
  const { scene } = useGLTF(url);
  return (
    <primitive
      object={scene.clone()}
      scale={0.45}
      position={[0, -0.55, 0]}
      rotation={[0, Math.PI, 0]}
    />
  );
}

type Props = {
  /** When false, always use procedural */
  allowGltf?: boolean;
};

export function CompanionAvatar({ allowGltf = true }: Props) {
  const [mode, setMode] = useState<"probe" | "gltf" | "proc">("probe");

  useEffect(() => {
    if (!allowGltf) {
      setMode("proc");
      return;
    }
    let cancelled = false;
    fetch(GLTF_URL, { method: "HEAD" })
      .then((r) => {
        if (!cancelled) setMode(r.ok ? "gltf" : "proc");
      })
      .catch(() => {
        if (!cancelled) setMode("proc");
      });
    return () => {
      cancelled = true;
    };
  }, [allowGltf]);

  if (mode === "probe") {
    return <PlaceholderChibi />;
  }

  if (mode === "gltf") {
    return (
      <Suspense fallback={<PlaceholderChibi />}>
        {/* Visual only — locomotion still driven by PlaceholderChibi physics
            when using pure GLTF we'd wrap differently; for drop-in we show GLTF
            as a static upgrade path. Prefer procedural until model ships. */}
        <GltfWithPhysics />
      </Suspense>
    );
  }

  return <PlaceholderChibi />;
}

/**
 * GLTF visual parented under the same locomotion as procedural.
 * For now: procedural body handles physics; if GLTF exists, we still use
 * PlaceholderChibi for reliable animation until a rigged model is provided.
 */
function GltfWithPhysics() {
  // Rigged GLTF animation is model-specific — keep procedural for motion fidelity.
  // When you add companion.glb with Idle/Walk clips, swap to useAnimations here.
  return <PlaceholderChibi />;
}

// Preload helper for when the file exists
try {
  useGLTF.preload?.(GLTF_URL);
} catch {
  /* optional */
}
