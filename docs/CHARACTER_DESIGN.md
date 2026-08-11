# Lantern-ko — Character Design Document

**Sprint 1 deliverable.**  
No geometry changes in this document — specification only.  
Source of truth for later face, secondary motion, and mesh work.

---

## 1. Design intent

Lantern-ko is a **tiny anime companion that lives inside the AnimeNexus UI**, not a generic chibi blob and not a full humanoid avatar.

Emotional targets:
- **Talking Tom** level of responsive personality and physical play
- **Clippy** level of “I inhabit this interface” relationship to UI
- More sophisticated, less annoying: never blocks critical controls, never punishes ignore

It must remain readable at ~48–80 CSS pixels tall on mobile and still feel like a character when the user is not interacting.

---

## 2. Silhouette (must read at thumbnail size)

Primary silhouette reads as:

```
        ★  (glow tip / lantern flame)
        │
      ╭───╮
      │ ◕ ◕ │   ← large head
      │  ▽  │
      ╰─┬─╯
        │     ← short neck / integrated
      ╭─┴─╮
      │   │   ← compact body
      ╰─┬─╯
       ╱ ╲    ← simple feet or soft stump base
```

**Recognition rules**
1. Big head + small body (classic chibi)
2. Single vertical accent on the crown (lantern tip / antenna flame)
3. Soft rounded outline — no sharp angles in the outer contour
4. From the side: still readable as “head + tip + body”, not a sphere

If the tip is removed, it should still feel chibi; with the tip, it must feel uniquely *Lantern-ko*.

---

## 3. Body proportions

| Region | Ratio (relative to head height = 1.0) | Notes |
|--------|--------------------------------------|--------|
| Head | 1.0 | Sphere-ish, slightly flattened vertically |
| Body (torso + hips) | 0.85–0.95 | Capsule / soft barrel, not skinny |
| Arms | 0.55 each | Short, stubby capsules; end in soft mitts (no individual fingers in v1) |
| Legs / base | 0.25–0.35 | Optional soft foot pads or integrated stump; keep simple for sit/climb |
| Overall height | ~1.9–2.1 head heights | True chibi, not teen proportion |

**Head-to-body ratio target:** roughly **1 : 0.9** (head almost as tall as the body).  
Current live Actor is already close in scale; the main upgrade is detail and limbs, not radical re-proportioning.

---

## 4. Signature features

### 4.1 Lantern tip (crown accent) — non-negotiable identity
- Small sphere or soft teardrop on a short stem above the head
- **Emissive** — always the brightest point on the character
- Colour driven by seasonal / time cosmetics (already in `seasonal.ts`)
- Secondary motion: gentle sway + intensity pulse with emotion (happy = brighter, sleep = dim)

This is the AnimeNexus visual element. Do not replace with a generic hair tuft without keeping an emissive “flame” reading.

### 4.2 Face
- **Eyes:** large dark ovals / spheres, slightly angled for cuteness; white highlight dots
- **Eyebrows:** thin, independent meshes or morph targets (critical for expression layer)
- **Mouth:** simple shape that can open into smile, “o”, flat line, small frown (torus / plane / morph)
- **Cheeks:** soft blush discs; opacity and colour driven by emotion (happy / embarrassed)
- **No nose** or a single tiny soft bump (optional)

### 4.3 Hair / ears
- Optional short soft hair cap or side tufts for silhouette interest
- **No large animal ears** in base design (keeps it humanoid-chibi + lantern, not “catgirl”)
- If a seasonal hat exists (leaf / scarf / star from cosmetics), it attaches to the tip stem or head top

### 4.4 Hands
- Soft mitts (rounded capsules)
- Enough articulation for: wave, point, grab ledge, push, hold cheeks
- No finger IK in v1

### 4.5 Feet
- Soft rounded pads or simple stump base
- Visible enough for plant / land compression
- Preferable to floating capsule-only body

### 4.6 Clothing
- Minimal: soft one-piece “hoodie / tunic” colour slightly deeper than skin, or none
- Avoid busy patterns — readability first
- Optional tiny scarf / ribbon that can flutter (secondary motion)

---

## 5. Colour palette (base)

| Element | Hex (approx) | Role |
|---------|--------------|------|
| Skin | `#f5d0c8` → `#e8a598` | Warm peach |
| Cheek blush | `#f0a090` | Transparent overlay |
| Eyes | `#2a1810` | Near-black |
| Eye highlight | `#ffffff` | Specular dots |
| Mouth / lip | `#c4786a` | Soft rose |
| Tip (default) | `#f0a090` + emissive | Identity glow |
| Optional tunic | `#d4a090` or soft indigo accent | Contrast without noise |

Seasonal overrides already exist for tip / emissive / cheek; keep those as the only seasonal colour system unless a full outfit pass is added later.

**Materials**
- Skin: `MeshStandardMaterial`, roughness ~0.4–0.5, low metalness
- Tip: same + emissive map / intensity driven by emotion
- Eyes: darker, slightly less rough so highlights read
- Avoid toon outline in v1 (performance + AA on small size); rely on silhouette and lighting

---

## 6. Expression system (design contract)

Expressions are **independent of locomotion**.  
A walk can be happy, sad, curious, or sleepy.

### Named expressions (v1 target set)

| ID | Brows | Eyes | Mouth | Cheeks | Notes |
|----|-------|------|-------|--------|-------|
| neutral | rest | open | soft line | low | baseline |
| happy | up / arched | open, bright | smile | medium–high | default positive |
| excited | high | wide | open smile | high | energy spikes |
| curious | one up | open, pupils track | small “o” or soft | low | investigate |
| confused | asymmetric | half / inward | wavy / flat | low | empty results |
| surprised | high | very wide | “O” | low | errors, jumpscare scroll |
| embarrassed | inward | half, look away | small | high blush | caught staring |
| sad | down / inward | half | frown | low | soft disappointment |
| sleepy | heavy | nearly closed | soft | low | nap / late night |
| scared | high, tense | wide, small pupils | open | low | rare |
| annoyed | flat / down | half | flat / pout | low | repeated drag |
| proud | slight up | open | smile | medium | after seal / complete |
| mischievous | one up | narrowed | smirk | low | cursor chase |
| focused | slight down | narrow | line | low | “reading” a card |
| smug | one up | half | side smile | low | after successful guide |

**Layering rule:**  
`expression` × `locomotion` × `look-at`  
Implementation later may use morph targets, bone rotations, or discrete mesh swaps — the contract is the named set above.

---

## 7. Animation-friendly topology (guidance for mesh work)

When geometry is upgraded (Sprint 2+):

- Keep **low poly** — this character is often ~50–80 px on screen
- Prefer separate groups: `root → pose → body`, `head`, `tip`, `armL`, `armR`, `browL`, `browR`, `mouth`, `eyeL`, `eyeR`, `cheekL`, `cheekR`
- Arms and head must be independent of body scale so squash/stretch does not break face
- Tip stem should be a child of head so head tilt carries the lantern
- Avoid skinned full body in v1 if procedural groups remain clearer; GLB later is optional

Secondary motion targets (Sprint 3):
- Breathe (chest / whole pose scale)
- Tip sway
- Arm settle after wave
- Land compression (Y scale + recovery)
- Optional soft hair / scarf lag

---

## 8. Scale in the product

| Context | Approx on-screen size | Notes |
|---------|----------------------|--------|
| Home pad (corner) | 56–72 px | Always readable |
| On anime card | 40–56 px | Must not cover title text |
| Dragging | same + slight scale-up | feedback |
| Mobile | never larger than ~15% of viewport width | already partly handled by lowPower path |

Current LiveTerrain Actor uses `scale ~0.5` in world units; keep overall world size in that ballpark so existing platform math does not break.

---

## 9. What stays from the prototype

Preserve:
- Warm peach skin + dark eyes + blush cheeks
- Emissive crown tip as identity
- Seasonal tip colours
- Chibi proportions
- Procedural / R3F path (no mandatory GLB)

Evolve:
- Add arms + mitts
- Add brows + mouth shapes
- Add soft feet / base
- Clearer silhouette (tip + head + body readable in one outline)
- Expression API separate from `anim` string

---

## 10. Name & personality flavour (for later sprints)

**Name:** Lantern-ko (already in product)

**Personality seeds** (to be turned into numeric traits in Sprint 6):
- Curious about recommendations
- Mildly mischievous with the cursor
- Soft and non-punishing when ignored
- Proud when the user seals / completes
- Sleepy at night / after long idle

Voice in thoughts: short, gentle, slightly poetic (“Soft desk light tonight.”) — already present in line pools; keep that tone.

---

## 11. Out of scope for this document

- Exact vertex counts
- GLB authoring pipeline
- Full clothing wardrobe
- Lip-sync to speech (no TTS required)
- Gendered design language beyond “cute anime companion”

---

## 12. Acceptance check for later mesh work

A still frame of the character should pass:

1. **Silhouette test:** tip + head + body readable in pure black outline  
2. **Face test:** at least happy / neutral / sleepy / surprised distinguishable without body pose  
3. **Size test:** readable at 64×64 px  
4. **Identity test:** someone who knows AnimeNexus can guess “this is the lantern mascot” from tip + peach chibi alone  
5. **Continuity test:** proportions close enough to current Actor that home pad and climb distances still feel right  

---

*End of Sprint 1 — Character Design Document.*  
Next recommended steps after approval: either (A) safety/idle/reachability fixes on LiveTerrain, or (B) extract character into a dedicated component + expression skeleton (Sprint 2 start).
