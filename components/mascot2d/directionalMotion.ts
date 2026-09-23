/** Direction and two-bone gait, in the rig's 1024 x 1536 coordinate space. */
export const clampAngle = (angle: number) => Math.max(-90, Math.min(90, Number.isFinite(angle) ? angle : 0));
export function turnView(angle: number) {
 const a = Math.abs(clampAngle(angle));
 return a < 7.5 ? 0 : a < 22.5 ? 15 : a < 37.5 ? 30 : a < 67.5 ? 45 : 90;
}
export function sampleSideWalk(t: number, moving = true, run = false, speed = 0) {
 const cycle = t * (run ? 1.65 : 1.05) * (1 + Math.max(0, Math.min(1, speed)) * .16);
 const phase = ((cycle % 1) + 1) % 1;
 const bob = moving ? -8 * Math.sin(phase * Math.PI * 4) : 0;
 function leg(offset: number) {
  const u = (phase + offset) % 1;
  const stance = u < .6;
  const v = stance ? u / .6 : (u - .6) / .4;
  const x = moving ? (stance ? 90 - 180 * v : -90 + 180 * (v * v * (3 - 2 * v))) : 0;
  const lift = moving && !stance ? Math.sin(v * Math.PI) ** 2 * (run ? 105 : 68) : 0;
  const y = 326 - lift - bob;
  const length = 170, d = Math.min(339.5, Math.hypot(x, y));
  const a = Math.atan2(x, y) + Math.acos(d / (length * 2));
  const kx = Math.sin(a) * length, ky = Math.cos(a) * length;
  const upper = -a * 180 / Math.PI;
  const lower = -Math.atan2(x - kx, y - ky) * 180 / Math.PI - upper;
  return { upper, lower, ankle: -(upper + lower), x, lift, stance };
 }
 return { near: leg(0), far: leg(.5), bob, arm: moving ? Math.sin(phase * Math.PI * 2) * 14 : 0,
  carry: moving ? Math.sin(phase * Math.PI * 2 - .35) * 3.5 : 0,
  hair: moving ? Math.sin(phase * Math.PI * 2 - .65) * 1.5 : 0 };
}
export function directionalValues(angle: number, t: number, anim: string, speed = 0, reduced = false) {
 const view=turnView(angle), g=sampleSideWalk(t,!reduced&&(anim==='walk'||anim==='run'),anim==='run',speed);
 return {
  'view-front':view===0?1:0,'view-15':view===15?1:0,'view-30':view===30?1:0,'view-45':view===45?1:0,'view-side':view===90?1:0,
  'facing-sign':angle<0?-1:1,'side-bob':g.bob,'side-arm':g.arm,'side-carry':g.carry,'side-hair':g.hair,
  'near-ankle':g.near.ankle,'far-ankle':g.far.ankle,'near-upper':g.near.upper,'near-lower':g.near.lower,'far-upper':g.far.upper,'far-lower':g.far.lower,
  'turn-squeeze':1-Math.abs(Math.abs(angle)-view)*.0015,
 };
}
