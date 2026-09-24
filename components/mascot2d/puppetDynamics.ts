/** Persistent, interruptible channels. Targets may change without resetting momentum. */
export type SpringChannel = { value: number; velocity: number };
export const channel = (value = 0): SpringChannel => ({ value, velocity: 0 });
export function advanceSpring(s: SpringChannel, target: number, dt: number, frequency = 3, damping = .82) {
 if (!Number.isFinite(target) || !Number.isFinite(dt) || dt <= 0) return s.value;
 // Small bounded steps keep suspended tabs and slower devices stable.
 const elapsed = Math.min(dt, .05), steps = Math.max(1, Math.ceil(elapsed / (1 / 240))), h = elapsed / steps;
 const omega = frequency * Math.PI * 2;
 for (let i = 0; i < steps; i++) {
  s.velocity += ((target - s.value) * omega * omega - 2 * damping * omega * s.velocity) * h;
  s.value += s.velocity * h;
 }
 if (Math.abs(target - s.value) < .0001 && Math.abs(s.velocity) < .0001) { s.value = target; s.velocity = 0; }
 return s.value;
}
export const smoothstep = (v: number) => { const u = Math.max(0, Math.min(1, v)); return u * u * (3 - 2 * u); };
export type LidState = { value: number; from: number; target: number; elapsed: number };
export const lidState = (): LidState => ({ value: 1, from: 1, target: 1, elapsed: 0 });
export function advanceLid(s: LidState, target: number, dt: number) {
 target = Math.max(0, Math.min(1, target));
 if (target !== s.target) { s.from = s.value; s.target = target; s.elapsed = 0; }
 s.elapsed += Math.max(0, Math.min(.05, dt));
 const closing = target < s.from, u = Math.min(1, s.elapsed / (closing ? .065 : .15));
 // Accelerating upper lid closure; slower, eased reopening. No iris squashing.
 s.value = s.from + (target - s.from) * (closing ? u * u : smoothstep(u));
 return s.value;
}
export function expressionTargets(expression: string, mouthOpen: number, mouthWide: number, mouthMood: number) {
 const happy = ['happy','excited','proud','smug','mischievous'].includes(expression);
 const sad = ['sad','scared'].includes(expression);
 return {
  eye: expression === 'sleepy' ? .62 : expression === 'annoyed' ? .8 : 1,
  brow: sad ? 8 : expression === 'surprised' ? -8 : happy ? -2 : 0,
  curve: sad || mouthMood < -.4 ? -1 : happy ? 1 : .2,
  mouth: Math.max(0, Math.min(1, Math.max(mouthOpen, expression === 'surprised' ? .8 : expression === 'excited' ? .35 : 0))),
  width: Math.max(0, Math.min(1, mouthWide)),
  slump: expression === 'sad' ? 1 : expression === 'sleepy' ? .45 : 0,
 };
}
