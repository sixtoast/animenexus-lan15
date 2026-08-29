# NexusIcon (Creative Sprint 19)

## Usage

```tsx
import { NexusIcon } from "@/components/ui/NexusIcon";

<NexusIcon name="shelf" />
<NexusIcon name="search" decorative={false} label="Search catalog" />
```

## Rules

1. Product code uses **semantic names** only (`home`, `browse`, `radar`…).
2. Never pass Iconify/Lucide ids into UI components.
3. Registry lives in `lib/icons/registry.ts` — swap glyphs/SVG in one place.
4. Sprint 20 bundles local SVG; this component’s public API stays stable.

## Names

See `NexusIconName` in the registry: navigation, tools, status, theme, seal, etc.
