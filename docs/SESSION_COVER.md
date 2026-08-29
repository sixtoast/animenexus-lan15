# Session Cover Generator 2.0 (Creative Sprint 16)

## Goal

Shareable editorial covers from **local** shelf data — not generic social spam.

## Layouts (deterministic)

| Layout | When |
|--------|------|
| `minimal` | Empty shelf |
| `desk` | Single title bias |
| `signal` | Resonance bars |
| `shelf` | ≥3 titles — up to 3 posters |
| `lantern` | Observation-forward |

Picked via hash of shelf ids (`pickSessionCoverLayout`).

## Ratios

| Key | Size |
|-----|------|
| portrait | 1080×1350 |
| square | 1080×1080 |
| landscape | 1920×1080 |
| og | 1200×630 |

## API

```ts
import {
  buildSessionCoverModel,
  renderSessionCover,
  downloadSessionCover,
} from "@/lib/session-cover";

const model = buildSessionCoverModel({ entries }, "og");
await downloadSessionCover(model);
```

UI: `/tools/session-cover`

## Privacy

Covers stay on-device until the user downloads. No automatic public OG upload.
