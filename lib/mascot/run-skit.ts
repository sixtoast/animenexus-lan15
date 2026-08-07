import { useMascotStore } from "./store";
import { pickSkit, SKIT_CHANCE, SKIT_COOLDOWN_MS } from "./skits";

/** Last skit timestamp (module-level; survives store shape). */
let lastSkitAt = 0;

/**
 * Attempt a spontaneous skit. Safe to call on an interval.
 * Never interrupts busy, loading, sleep, or celebration.
 */
export function tryRunSkit(): boolean {
  const s = useMascotStore.getState();
  if (!s.enabled) return false;
  if (Date.now() < s.busyUntil) return false;
  if (s.loadingSince) return false;
  if (
    s.anim === "sleep" ||
    s.anim === "happy" ||
    s.anim === "jump" ||
    s.anim === "surprised"
  )
    return false;
  if (Date.now() - lastSkitAt < SKIT_COOLDOWN_MS) return false;
  if (Math.random() > SKIT_CHANCE) return false;

  const skit = pickSkit(s.emotions);
  if (!skit) return false;

  lastSkitAt = Date.now();
  s.setTarget(null);

  if (skit.id === "stretch") {
    // jump impulse + stretch
    useMascotStore.setState({ jumpQueued: true });
  }

  s.requestAnim({ anim: skit.anim, holdMs: skit.holdMs, force: true });

  if (skit.follow) {
    window.setTimeout(() => {
      s.requestAnim({
        anim: skit.follow!.anim,
        holdMs: skit.follow!.holdMs || 800,
      });
    }, skit.holdMs);
  }

  return true;
}
