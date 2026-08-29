"use client";

import { useEffect } from "react";
import { recordView } from "@/lib/lantern-memory";
import { emitNexus } from "@/lib/nexus";
import { playCue } from "@/lib/sound-engine";

type Props = {
  id: number;
  title: string;
  image?: string;
  genres?: string[];
  studios?: string[];
};

/** Records a detail-page view into Lantern memory + Nexus event bus */
export function MemoryVisit({ id, title, image, genres, studios }: Props) {
  useEffect(() => {
    recordView({ id, title, image, genres, studios });
    emitNexus({ type: "anime_viewed", animeId: id, title });
    playCue("memory_focus");
  }, [id, title, image, genres, studios]);
  return null;
}
