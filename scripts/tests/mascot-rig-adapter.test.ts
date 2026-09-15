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
  assert.ok(pose.eyeOpenL >= 0 && pose.eyeOpenL <= 1.25);
  assert.ok(pose.eyeOpenR >= 0 && pose.eyeOpenR <= 1.25);
  assert.ok(pose.pupilX >= -0.28 && pose.pupilX <= 0.28);
  assert.ok(pose.pupilY >= -0.18 && pose.pupilY <= 0.18);
  assert.ok(pose.blush >= 0 && pose.blush <= 1);
  assert.ok(pose.headYaw >= -0.055 && pose.headYaw <= 0.055);
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
});

test("sleep forces closed eyes", () => {
  const sleepy: MascotEmotions = { ...emotions, sleepiness: 0.9 };
  const pose = resolveFaceRigPose("neutral", sleepy, "sleep", 1, { x: 0.5, y: 0.5 }, 0);
  assert.ok(pose.eyeOpenL < 0.2);
  assert.ok(pose.eyeOpenR < 0.2);
});

test("neutral stays reasonably open when not sleepy", () => {
  const pose = resolveFaceRigPose("neutral", emotions, "idle", 1, { x: 0, y: 0 }, 0);
  assert.ok(pose.eyeOpenL >= 0.85);
  assert.ok(pose.eyeOpenR >= 0.85);
});

test("happy smile does not force intense side pupils", () => {
  const pose = resolveFaceRigPose("happy", emotions, "happy", 1, { x: 0.3, y: 0 }, 0);
  assert.ok(Math.abs(pose.pupilX) <= 0.28);
  assert.ok(pose.mouthCurve > 0.3);
  assert.ok(pose.eyeOpenL >= 0.85);
});

test("micro-saccades stay nearly invisible and in socket", () => {
  for (let t = 0; t < 10; t += 0.37) {
    const pose = resolveFaceRigPose("curious", emotions, "idle", t, { x: 0.5, y: -0.3 }, 0);
    assert.ok(pose.pupilX >= -0.28 && pose.pupilX <= 0.28);
    assert.ok(pose.pupilY >= -0.18 && pose.pupilY <= 0.18);
  }
});
