# Decorative restraint (Creative Sprint 52)

## Principle

Premium UI is defined as much by **what you remove** as by capability.

After the creative stack exists, **do not stack** every effect on one card.

## Anti-pattern (remove most)

On a single interactive card, avoid combining all of:

- material glow
- parallax
- Rive icon
- Lottie badge
- hover sound
- scale pop
- animated shadow
- particles

**Pick one or two** meaningful responses (e.g. soft lift + border, or OutcomeMark on confirm).

## Route guidance

| Surface | Allowed decoration |
|---------|-------------------|
| Browse cards | Lift + image resolve; no SFX on hover |
| Tool instruments | One primary motion system (Rive *or* CSS) |
| Stats / Taste | Typography + data; almost no ornament |
| Shelf | Spatial *or* 2D list — not both competing |
| Toasts | Mark + message; no confetti for micro |

## Hierarchy reminder

1. CSS first  
2. Then stateful illustration only when it earns the cost  
3. Sound only for meaningful outcomes  
4. 3D only when spatial is the product

## CSS

`app/restraint.css` soft-caps stacked card motion under normal tiers.

## Related

- `docs/MICRO_DENSITY.md`, `docs/SUCCESS_HIERARCHY.md`, `docs/TOOL_IDENTITY.md`
