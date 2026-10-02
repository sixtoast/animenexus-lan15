"use client";

import { useState } from "react";
import type { Anime } from "@/lib/types";
import { AnimeUniversePortal } from "@/components/AnimeUniversePortal";

export function AnimeUniverseDirectEntry({ anime }: { anime: Anime }) {
  const [open, setOpen] = useState(true);

  if (!open) return null;

  return (
    <AnimeUniversePortal
      anime={anime}
      onClose={() => setOpen(false)}
      onEnterDossier={() => setOpen(false)}
    />
  );
}
