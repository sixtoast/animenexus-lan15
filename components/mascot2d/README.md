# Lantern-ko Coral PNG layers

A new simplified Lantern-ko design using the AnimeNexus website's plum, peach-coral, ivory, amber and muted lilac palette.

## Included
- 15 separate transparent RGBA PNG layers, each 1024 × 1536.
- A separate full-character design reference.
- A layer-toggle preview: unzip and open preview.html in a browser.
- layers.json with suggested source rectangles, placement, layer order and pivots.
- The layer-generation prompts in PROMPTS.json.

The arms, legs and eyes are individually separated. Left/right names are relative to the viewer. The eyebrows are a pair on one image. The dress and cape are combined to keep the model simple. Hair-front includes the curl and side locks. Hands are attached to sleeves; boots are attached to legs. Eyes include their pupils, highlights and lashes.

## Upload
Copy public/mascot2d/lantern-ko-coral/ into your repository. No existing files need to be overwritten.

These are artwork assets, not an installed website replacement or a rigged Live2D Cubism model. The renderer must load and animate the separate images. Your existing single-image BASE_ART renderer will not pick them up automatically.

## Placement
The source PNGs were generated as independent parts. Their native scales and positions differ. Do not stack all full-size images at (0, 0).

Use layers.json: sourceRect and targetRect are [x, y, width, height]. Draw the source rectangle of each PNG into its target rectangle on a 1024 × 1536 logical canvas. Render in array order. Pivots are canvas pixel coordinates; parent identifies an intended animation group, not an implemented rig.

The suggested layout is a starting point, not a verified match to the separately generated reference. Tune overlaps and anchor positions in your renderer. The preview implements the supplied layout but was not browser-rendered in this environment.

For expressive speech and blinking, retain your existing procedural face rig over face-base, hiding the optional eye, brow and mouth artwork. The supplied mouth is a closed smile, not a viseme set. These layers alone do not provide full Cubism-style eye deformation or lip-sync.

## Validation and provenance
All 15 image files were checked for RGBA mode, 1024 × 1536 dimensions and both transparent and visible pixels. Source pixels are preserved. They were generated with the built-in image tool from the new design reference.

Palette source: https://github.com/sixtoast/animenexus-lan15/blob/main/app/tokens.css

