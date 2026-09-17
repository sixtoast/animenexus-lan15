# Authored coral pose layers

Generated with the built-in image-generation tool using the existing design-reference.png as the style and identity reference. Original RGBA outputs are retained, without destructive pixel edits.

- sitting.png: seated lower-body costume, including skirt, opaque cream socks and boots.
- pointing.png: free sleeve and hand pointing screen-right.
- grip.png: one continuous holding-arm, hand, handle and lantern sprite, so the grip cannot separate.
- profile.png: full-body right-facing profile. The renderer mirrors it for left-facing.

CoralImageRig2D.tsx contains source crops and destination rectangles. The head group is offset 20 stage pixels left. Pose dimensions use a common 1024 x 1536 stage.

Sitting and pointing use a 0.3-second anticipation beat followed by exponential acceleration and a damped overshoot. Reduced motion selects the settled pose directly. Normal locomotion can transition to profile; callers may also pass facingAngleDeg (-90 left, 0 front, 90 right) to LanternKo2D. This is an illustrated sprite transition, not a 3D rotation. The single profile sprite does not support separate blinking, lip-sync or limb articulation.

## Generation prompts

All prompts used the existing design-reference.png as a style/identity reference and requested transparent alpha.

Sitting: ONLY the clothed lower half of the friendly chibi fantasy mascot, sitting on an invisible ledge. Include the entire cream flared skirt with coral hem covering the lap and knees, cream opaque socks covering the lower legs entirely, dark plum ankle boots with coral soles. No exposed legs or skin. Front view, boots hanging side by side below skirt, equally sized, compact cute proportions. No upper body, face, chair or scenery. Match anime linework, cream/coral/plum colours and cel shading. Centre the complete lower-body costume layer with generous transparent padding. No text, glow or painted checkerboard.

Pointing: ONLY the free arm and sleeve pointing horizontally screen-right. Shoulder attachment at left, loose cream bell sleeve with coral piping and dark muted plum lining, small hand at right with extended index finger and other fingers naturally curled. Fully clothed long sleeve, only hand exposed. Same anime cel shading, delicate dark outlines and warm palette. No body, head, lantern, text or other objects. Entire arm visible with transparent padding.

Grip: ONLY the screen-left lantern-holding arm with its lantern, joined as one continuous artwork. Shoulder attachment at upper right, cream bell sleeve with coral trim and plum lining draping down-left, small visible hand wrapped firmly around the very top of the plum handle, fingers overlapping its front and thumb behind. Lantern hangs vertically beneath the hand, with dark plum cat ears, coral star and warm golden cat inside. Entire sleeve, hand, handle and lantern visible. No body, head, legs, other props or atmospheric halo.

Profile: Full-body true 90-degree side profile of the same chibi mascot facing screen-right. Cream short bob and curled tuft, amber eye, plum cat-ear hood with coral lining, coral bow, plum cape, cream dress/socks and plum boots with coral soles. Relaxed standing pose, hand firmly gripping the lantern handle. Entire mascot in frame. Preserve identity, outfit, proportions and anime cel shading; profile nose, single visible eye, overlapping far limbs. No floor shadow, atmosphere, background halo or text.
