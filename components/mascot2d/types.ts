import type { MascotAnim, MascotEmotions } from "@/lib/mascot/types";
import type { ExpressionKey } from "@/components/mascot/LanternKoMeshV2";

export type LanternKo2DProps = {
  expression: ExpressionKey;
  emotions: MascotEmotions;
  lookBias?: { x: number; y: number };
  anim: MascotAnim;
  yaw?: number;
  speed?: number;
  justLanded?: boolean;
  className?: string;
  /** 0 disables the depth offsets, 1 is the production 2.5D amount. */
  depth?: number;
};

export type LanternKo2DLayer =
  | "back-cloak"
  | "body"
  | "arms"
  | "face"
  | "blush"
  | "eyes"
  | "brows"
  | "mouth"
  | "hair-back"
  | "hair-front"
  | "hood"
  | "lantern";
