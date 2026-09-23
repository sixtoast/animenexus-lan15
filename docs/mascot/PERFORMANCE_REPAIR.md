# Mascot performance repair

Review-branch changes, not a verified production release:

- Mount only the selected directional rig instead of all five image-heavy rigs.
- Preserve head-follow and micro-motion state when gaze or movement inputs change.
- Cap decorative React updates at 30 Hz, pause them in hidden tabs and under reduced motion, and avoid publishing settled spring values.
- Avoid redundant rig CSS writes and ignore the mascot's own DOM mutations when scheduling terrain rebuilds.
- Keep the side-view calf and boot in one crop to remove the articulated ankle seam; overlap the knee crops and remove translucent far-leg compositing.
- Widen the profile head and legs to move their proportions closer to the front rig.

Checks: `node --test scripts/tests/mascot-visual-frame.test.cjs` covers frame cadence, current inputs, hidden tabs, reduced motion and cleanup. Edited TypeScript/TSX files pass syntax transpilation. The full repository has existing type errors.

Pending: browser visual review of all turn angles and the full gait, mobile frame-time/memory profiling, and reproduction of the reported website crash. The browser helper failed to start and the fallback runner has no Chromium executable in this environment. These changes must not be described as crash-proof or visually approved. Exported PNG frame sequences are unchanged and still show the previous rig.
