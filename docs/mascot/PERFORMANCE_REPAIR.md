# Mascot repair status

Review branch only. This remains a layered SVG puppet, not a Live2D mesh model.

## Implemented

- Persistent spring channels for head angle, torso follow, hood and front/back hair lag. Changing direction preserves position and velocity.
- Continuous eyebrow, mouth opening/width/curve and sad-posture parameters. Eye tracking is independent of face registration.
- Accelerating 65 ms lid closure and slower 150 ms reopening. Masks reveal intact eyes; they do not flatten the iris. The lower edge moves one tenth of the closure distance.
- Profile eye and mouth use the same continuous parameters rather than conditionally mounting open/closed drawings.
- Independent chest breathing and delayed clothing skew, with anticipation/settle timing for pointing, surprise and celebration.
- One rig loop writes changed CSS values only. No additional per-frame React state for these channels. Hidden tabs pause the action clock and blink scheduling. Reduced-motion updates share the same CSS cache and reset spring velocities.
- Earlier fixes: capped decorative React updates; terrain observer ignores mascot mutations; one lab actor; small drag handle; a single dress during sitting; intact profile leg silhouette.
- Front sitting now uses a 24-triangle continuous texture mesh per leg, with fixed-length thigh/shin bones, blended knee and ankle skin weights, and independent shin kicks. The thigh folds 82 degrees towards the viewer; projection foreshortens it without scaling the entire leg. Boot volume follows the ankle. The standing mesh reproduces the existing texture registration.

## Checks

Run `node --test scripts/tests/mascot-leg-mesh.test.cjs scripts/tests/mascot-puppet-dynamics.test.cjs scripts/tests/mascot-continuous-motion.test.cjs scripts/tests/mascot-visual-frame.test.cjs`.

Fourteen tests cover the mesh's rest registration, fixed bone lengths, shared triangle edges, absence of inversions, independent kicks and cached DOM writes, plus interruption/reversal, settling, bounded integration, 30/60/120 Hz consistency, asymmetric blinking, expression targets, distinct turn parameters, sit/kick/point continuity and decorative-loop lifecycle.

Repository-wide TypeScript checking still reports unrelated application errors. Passing mathematical tests do not establish visual quality, measured frame rate or crash safety.

## Not yet solved

- The 55–80 degree transition still blends a separate profile illustration. This is not continuous mesh topology and can ghost.
- The new leg mesh is a front-view 2.5D projection, not a fully modelled 3D leg. It reuses painted front textures, so it cannot reveal unseen soles or knee surfaces at extreme angles. Mobile GPU/frame-time cost still needs measurement.
- The profile gait uses intact swinging legs to avoid broken crop seams; it does not yet have planted feet and articulated knees.
- The grip artwork combines sleeve, hand, handle and lantern. Independent lantern-mass physics needs registered separation and painted overlap underneath the hand.
- Hair and clothing lag act on existing broad layers, not 8–12 hair strands or a deformable cloth mesh. Eyes are complete eye images, not separate iris/pupil/highlight layers.
- Mobile frame-time/memory profiling and reproduction of the reported crash remain outstanding. Exported PNG sequences are unchanged.

Do not describe this pass as completing every issue in the animation critique.
