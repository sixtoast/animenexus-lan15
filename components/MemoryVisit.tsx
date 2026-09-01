"use client";

import { useEffect } from "react";
import { recordView } from "@/lib/lantern-memory";
import { emitNexus } from "@/lib/nexus";
import { playCue } from "@/lib/sound-engine";
import { logBehaviour } from "@/lib/behaviour-events";

type Props = {
  id: number;
  title: string;
  image?: string;
  genres?: string[];
  studios?: string[];
};

/** Records a detail-page view into Lantern memory + behaviour + Nexus */
export function MemoryVisit({ id, title, image, genres, studios }: Props) {
  useEffect(() => {
    recordView({ id, title, image, genres, studios });
    emitNexus({ type: "anime_viewed", animeId: id, title });
    logBehaviour("detail_open", { animeId: id });
    playCue("memory_focus");
  }, [id, title, image, genres, studios]);
  return null;
}
