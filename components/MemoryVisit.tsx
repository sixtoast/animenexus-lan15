"use client";

import { useEffect } from "react";
import { recordView } from "@/lib/lantern-memory";

type Props = {
  id: number;
  title: string;
  image?: string;
  genres?: string[];
  studios?: string[];
};

/** Records a detail-page view into Lantern memory */
export function MemoryVisit({ id, title, image, genres, studios }: Props) {
  useEffect(() => {
    recordView({ id, title, image, genres, studios });
  }, [id, title, image, genres, studios]);
  return null;
}
