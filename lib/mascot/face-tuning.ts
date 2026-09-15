/**
 * Lantern-ko face visual tuning — presentation only.
 * Owned by the V3 render path (rig-adapter + procedural mesh).
 * Not a second brain; does not decide behaviour or attention targets.
 */

export const FACE_TUNING = {
  /** Everyday pupil travel (normalised). Stronger attention can stretch toward strong*. */
  normalGazeX: 0.2,
  normalGazeY: 0.14,
  strongGazeX: 0.3,
  strongGazeY: 0.2,
  /** Hard socket-safe clamps after all offsets. */
  pupilXMax: 0.28,
  pupilYMax: 0.18,

  /** Head follows less than eyes. */
  headYawGain: 0.048,
  headPitchGain: 0.032,
  headYawMax: 0.055,
  headPitchMax: 0.075,
  headRollMax: 0.1,

  /** Nearly invisible life in the pupil (not noticeable shake). */
  saccadeAmpX: 0.0035,
  saccadeAmpY: 0.0025,

  /** Soft break of perfect centred stare. */
  directStarePupilBias: 0.035,
  directStareRoll: 0.018,

  /** Non-sleep eye openness should stay cute, not half-lidded. */
  neutralEyeOpenFloor: 0.88,

  /** Geometry — relative to HEAD_R in procedural mesh. */
  irisScale: 0.155,
  pupilScale: 0.055,
  highlightScale: 0.022,
  eyeSeparation: 0.34,
  eyeY: 0.04,
  lidThickness: 0.045,
} as const;

export type FaceTuning = typeof FACE_TUNING;
