/**
 * Shared hydration for semantic-neighbour hits → production Anime cards.
 * Never expose "Indexed #id" to UI.
 */
import type { Anime } from "@/lib/types";
import { parseNexusId } from "@/lib/anime-identity";

const mem = new Map<string, Anime>();

export function putAnimeInCatalogCache(anime: Anime, nexusId?: string): void {
  if (!anime?.id) return;
  mem.set(`id:${anime.id}`, anime);
  if (nexusId) mem.set(`nx:${nexusId}`, anime);
  if (anime.anilist_id) mem.set(`anilist:${anime.anilist_id}`, anime);
  if (anime.idMal) mem.set(`mal:${anime.idMal}`, anime);
}

function fromMem(nexusId: string, animeId?: number): Anime | null {
  if (nexusId && mem.has(`nx:${nexusId}`)) return mem.get(`nx:${nexusId}`)!;
  if (animeId && mem.has(`id:${animeId}`)) return mem.get(`id:${animeId}`)!;
  const parsed = parseNexusId(nexusId);
  if (parsed && parsed.provider && parsed.id) {
    const k = `${parsed.provider}:${parsed.id}`;
    if (mem.has(k)) return mem.get(k)!;
  }
  return null;
}

export function isStubTitle(title: string | undefined | null): boolean {
  if (!title) return true;
  return /^Indexed\s*#\d+/i.test(title) || /^Unknown anime/i.test(title);
}

export async function hydrateCandidateByNexusId(
  nexusId: string,
  opts?: {
    animeId?: number;
    allowNetwork?: boolean;
  },
): Promise<Anime | null> {
  if (!nexusId) return null;
  const hit = fromMem(nexusId, opts?.animeId);
  if (hit && !isStubTitle(hit.title)) return hit;
  if (opts?.allowNetwork === false) return null;

  const parsed = parseNexusId(nexusId);
  if (!parsed) return null;

  try {
    if (parsed.provider === "anilist" && parsed.id) {
      const id = parseInt(parsed.id, 10);
      if (id > 0) {
        const res = await fetch(`/api/anime/${id}`, { cache: "force-cache" });
        if (res.ok) {
          const j = await res.json();
          const a = (j.data || j.anime || j) as Anime;
          if (a?.id && a.title && !isStubTitle(a.title)) {
            putAnimeInCatalogCache(a, nexusId);
            return a;
          }
        }
      }
    }
    if (parsed.provider === "mal" && parsed.id) {
      const malId = parseInt(parsed.id, 10);
      if (malId > 0) {
        const { malOfficialById } = await import("@/lib/providers/mal-official");
        const a = await malOfficialById(malId);
        if (a?.id && a.title && !isStubTitle(a.title)) {
          putAnimeInCatalogCache(a, nexusId);
          return a;
        }
      }
    }
  } catch {
    /* soft */
  }
  return null;
}

export async function hydrateCandidateRecords<
  T extends { nexusId: string; anime: Anime },
>(
  records: T[],
  opts?: { allowNetwork?: boolean; limit?: number },
): Promise<T[]> {
  const limit = opts?.limit ?? records.length;
  const out: T[] = [];
  for (const rec of records) {
    if (out.length >= limit) break;
    if (rec.anime?.title && !isStubTitle(rec.anime.title)) {
      putAnimeInCatalogCache(rec.anime, rec.nexusId);
      out.push(rec);
      continue;
    }
    const hydrated = await hydrateCandidateByNexusId(rec.nexusId, {
      animeId: rec.anime?.id,
      allowNetwork: opts?.allowNetwork !== false,
    });
    if (hydrated && !isStubTitle(hydrated.title)) {
      out.push({ ...rec, anime: hydrated });
    }
  }
  return out;
}
