import type { MascotAnim, MascotEmotions } from "@/lib/mascot/types";
import type { ExpressionKey } from "@/components/mascot/expression-bridge";

export type PerchPose = "stand" | "sit" | "crouch" | "peek-left" | "peek-right";

export type LanternKo2DProps = {
  expression: ExpressionKey;
  emotions: MascotEmotions;
  lookBias?: { x: number; y: number };
  /** Renderer-local gaze layered over the brain-owned look bias. */
  gazeOverride?: { x: number; y: number };
  anim: MascotAnim;
  yaw?: number;
  /** Explicit sprite facing angle: -90 left, 0 front, 90 right. */
  facingAngleDeg?: number;
  speed?: number;
  justLanded?: boolean;
  className?: string;
  /** Existing brain/UI context. Rendering only, never decides behaviour. */
  context?: { intention?: string | null; lastLandmarkType?: string | null };
  /** Physical pose selected from the real landmark geometry. */
  perchPose?: PerchPose;
  /** 0 disables the depth offsets, 1 is the production 2.5D amount. */
  depth?: number;
  /** Speech activity only. Text/audio interpretation remains outside the renderer. */
  speaking?: boolean;
  /** User-input/listening activity. The host decides when the user is actively composing. */
  listening?: boolean;
  /** Real assistant processing state. Rendering only, never fabricates work. */
  thinking?: boolean;
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

