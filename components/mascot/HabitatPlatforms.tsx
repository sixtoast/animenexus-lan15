"use client";

import { HABITAT_PLATFORMS } from "@/lib/mascot/physics";
import { useMascotStore } from "@/lib/mascot/store";

/** Visible ledges — click to climb */
export function HabitatPlatforms() {
  const dispatch = useMascotStore((s) => s.dispatch);

  return (
    <group>
      {HABITAT_PLATFORMS.map((p) => {
        const w = p.maxX - p.minX;
        const d = p.maxZ - p.minZ;
        const cx = (p.minX + p.maxX) / 2;
        const cz = (p.minZ + p.maxZ) / 2;
        return (
          <mesh
            key={p.id}
            position={[cx, -0.72 + p.y * 0.22 + 0.02, cz]}
            onClick={(e) => {
              e.stopPropagation();
              dispatch({ type: "climb", x: cx, z: cz });
            }}
          >
            <boxGeometry args={[w * 0.95, 0.06, d * 0.95]} />
            <meshStandardMaterial
              color="#3a2e28"
              roughness={0.85}
              transparent
              opacity={0.55}
            />
          </mesh>
        );
      })}
    </group>
  );
}
