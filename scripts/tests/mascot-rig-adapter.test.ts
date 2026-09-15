import test from "node:test";
import assert from "node:assert/strict";
import { resolveFaceRigPose } from "../../lib/mascot/rig-adapter.ts";
import type { MascotEmotions } from "../../lib/mascot/types.ts";

const emotions: MascotEmotions = {
  curiosity: 0.6,
  energy: 0.55,
  happiness: 0.65,
  boredom: 0.1,
  sleepiness: 0.1,
  attention: 0.7,
  confidence: 0.6,
  stress: 0.1,
};

test("rig adapter keeps continuous channels bounded", () => {
  const pose = resolveFaceRigPose("curious", emotions, "idle", 1, { x: 1, y: -1 }, 0);
  assert.ok(pose.eyeOpenL >= 0 && pose.eyeOpenL <= 1.4);
  assert.ok(pose.eyeOpenR >= 0 && pose.eyeOpenR <= 1.4);
  // Socket-safe pupil travel after visual tuning pass
  assert.ok(pose.pupilX >= -0.42 && pose.pupilX <= 0.42);
  assert.ok(pose.pupilY >= -0.28 && pose.pupilY <= 0.28);
  assert.ok(pose.blush >= 0 && pose.blush <= 1);
  assert.ok(pose.headYaw >= -0.09 && pose.headYaw <= 0.09);
});

test("blink closes eyes without moving the engine state", () => {
  const open = resolveFaceRigPose("neutral", emotions, "idle", 1, { x: 0, y: 0 }, 0);
  const blink = resolveFaceRigPose("neutral", emotions, "idle", 1, { x: 0, y: 0 }, 1);
  assert.ok(blink.eyeOpenL < open.eyeOpenL);
  assert.ok(blink.eyeOpenR < open.eyeOpenR);
});

test("animation adds presentation bias rather than replacing expression", () => {
  const idle = resolveFaceRigPose("embarrassed", emotions, "idle", 1, { x: 0, y: 0 }, 0);
  const bow = resolveFaceRigPose("embarrassed", emotions, "bow", 1, { x: 0, y: 0 }, 0);
  assert.ok(bow.blush >= idle.blush);
  assert.ok(bow.eyeOpenR <= idle.eyeOpenR);
});

test("sleep forces closed eyes", () => {
  const sleepy: MascotEmotions = { ...emotions, sleepiness: 0.9 };
  const pose = resolveFaceRigPose("neutral", sleepy, "sleep", 1, { x: 0.5, y: 0.5 }, 0);
  assert.ok(pose.eyeOpenL < 0.25);
  assert.ok(pose.eyeOpenR < 0.25);
});

test("embarrassed boosts blush for mobile readability", () => {
  const pose = resolveFaceRigPose("embarrassed", emotions, "idle", 1, { x: 0, y: 0 }, 0);
  assert.ok(pose.blush >= 0.75);
});

test("micro-saccades keep pupils inside socket", () => {
  for (let t = 0; t < 10; t += 0.37) {
    const pose = resolveFaceRigPose("curious", emotions, "idle", t, { x: 0.8, y: -0.6 }, 0);
    assert.ok(pose.pupilX >= -0.42 && pose.pupilX <= 0.42);
    assert.ok(pose.pupilY >= -0.28 && pose.pupilY <= 0.28);
  }
});
