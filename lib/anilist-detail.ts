/**
 * Rich single-title fetch (studios, trailer, characters, relations + recommendations).
 */
import { mapAniListMedia, ANILIST_ENDPOINT } from "./anilist";
import type { Anime, AnimeRelation, GraphEdge, GraphNode } from "./types";

type GqlResponse<T> = {
  data?: T;
  errors?: { message: string }[];
};

async function gql<T>(
  query: string,
  variables: Record<string, unknown> = {},
): Promise<T> {
  const init: RequestInit & { next?: { revalidate: number } } = {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({ query, variables }),
  };
  if (typeof window === "undefined") {
    init.next = { revalidate: 120 };
  }
  const res = await fetch(ANILIST_ENDPOINT, init);
  if (!res.ok) throw new Error(`AniList HTTP ${res.status}`);
  const json = (await res.json()) as GqlResponse<T>;
  if (json.errors?.length) {
    throw new Error(json.errors.map((e) => e.message).join("; "));
  }
  if (!json.data) throw new Error("AniList returned empty data");
  return json.data;
}

const RELATION_NODE = `
  id
  type
  title { romaji english }
  format
  status
  startDate { year }
  averageScore
  coverImage { large medium }
`;

const DETAIL_FIELDS = `
  id
  idMal
  title { romaji english native }
  description
  genres
  status
  format
  startDate { year }
  season
  seasonYear
  averageScore
  popularity
  favourites
  coverImage { large medium }
  bannerImage
  siteUrl
  episodes
  duration
  isAdult
  source
  studios { nodes { name } }
  trailer { id site thumbnail }
  characters(sort: [ROLE, RELEVANCE, ID], perPage: 16) {
    edges {
      role
      node {
        id
        name { full }
        image { large medium }
      }
    }
  }
  relations {
    edges {
      relationType
      node { ${RELATION_NODE} }
    }
  }
  recommendations(page: 1, perPage: 12, sort: RATING_DESC) {
    nodes {
      rating
      mediaRecommendation {
        ${RELATION_NODE}
      }
    }
  }
`;

const NON_ANIME_TYPE = new Set(["MANGA", "NOVEL"]);

type RelNode = {
  id: number;
  type?: string;
  title?: { romaji?: string; english?: string };
  format?: string;
  status?: string;
  startDate?: { year?: number | null };
  averageScore?: number | null;
  coverImage?: { large?: string; medium?: string };
};

function nodeFromRel(n: RelNode, relationType: string): AnimeRelation | null {
  if (!n?.id) return null;
  if (n.type && NON_ANIME_TYPE.has(n.type)) return null;
  const fmt = (n.format || "").toUpperCase();
  if (fmt === "MANGA" || fmt === "NOVEL") return null;
  return {
    id: n.id,
    title: n.title?.english || n.title?.romaji || "Untitled",
    relationType,
    format: n.format,
    status: n.status,
    image: n.coverImage?.large || n.coverImage?.medium,
    year: n.startDate?.year ?? null,
    score: n.averageScore != null ? n.averageScore / 10 : null,
  };
}

export function mapRelationEdges(
  edges: { relationType?: string; node?: RelNode }[],
): AnimeRelation[] {
  const relations: AnimeRelation[] = [];
  const seen = new Set<number>();
  for (const e of edges) {
    const mapped = nodeFromRel(e.node!, e.relationType || "RELATED");
    if (!mapped || seen.has(mapped.id)) continue;
    seen.add(mapped.id);
    relations.push(mapped);
  }
  return relations;
}

function mapRecommendations(
  nodes: {
    rating?: number;
    mediaRecommendation?: RelNode | null;
  }[],
  already: Set<number>,
): AnimeRelation[] {
  const out: AnimeRelation[] = [];
  for (const n of nodes) {
    const mapped = nodeFromRel(n.mediaRecommendation!, "RECOMMENDED");
    if (!mapped || already.has(mapped.id)) continue;
    already.add(mapped.id);
    out.push(mapped);
  }
  return out;
}

export async function fetchAnimeDetail(id: number): Promise<Anime | null> {
  const query = `
    query ($id: Int) {
      Media(id: $id, type: ANIME) {
        ${DETAIL_FIELDS}
      }
    }
  `;
  const data = await gql<{ Media: Record<string, unknown> | null }>(query, {
    id,
  });
  if (!data.Media) return null;

  const anime = mapAniListMedia(data.Media);

  const idMal = data.Media.idMal;
  if (typeof idMal === "number") anime.idMal = idMal;

  const studios = (
    data.Media.studios as { nodes?: { name: string }[] } | undefined
  )?.nodes;
  if (studios?.length) {
    anime.studios = studios.map((n) => n.name).filter(Boolean);
  }

  const tr = data.Media.trailer as
    | { id?: string; site?: string; thumbnail?: string }
    | null
    | undefined;
  if (tr) {
    anime.trailer = {
      id: tr.id,
      site: tr.site,
      thumbnail: tr.thumbnail,
    };
  }

  const edges =
    (
      data.Media.characters as {
        edges?: {
          role?: string;
          node?: {
            id: number;
            name?: { full?: string };
            image?: { large?: string; medium?: string };
          };
        }[];
      }
    )?.edges || [];

  anime.characters = edges
    .filter((e) => e.node)
    .map((e) => ({
      id: e.node!.id,
      name: e.node!.name?.full || "Unknown",
      role: e.role || "SUPPORTING",
      image: e.node!.image?.large || e.node!.image?.medium,
    }));

  const relEdges =
    (
      data.Media.relations as {
        edges?: { relationType?: string; node?: RelNode }[];
      }
    )?.edges || [];

  const relations = mapRelationEdges(relEdges);
  const seen = new Set(relations.map((r) => r.id));
  seen.add(id);

  const recNodes =
    (
      data.Media.recommendations as {
        nodes?: {
          rating?: number;
          mediaRecommendation?: RelNode | null;
        }[];
      }
    )?.nodes || [];

  anime.relations = [...relations, ...mapRecommendations(recNodes, seen)];

  return anime;
}

async function fetchMediaLinks(id: number): Promise<{
  relations: AnimeRelation[];
  recommendations: AnimeRelation[];
}> {
  const query = `
    query ($id: Int) {
      Media(id: $id, type: ANIME) {
        relations {
          edges {
            relationType
            node { ${RELATION_NODE} }
          }
        }
        recommendations(page: 1, perPage: 10, sort: RATING_DESC) {
          nodes {
            rating
            mediaRecommendation { ${RELATION_NODE} }
          }
        }
      }
    }
  `;
  const data = await gql<{
    Media: {
      relations?: { edges?: { relationType?: string; node?: RelNode }[] };
      recommendations?: {
        nodes?: {
          rating?: number;
          mediaRecommendation?: RelNode | null;
        }[];
      };
    } | null;
  }>(query, { id });

  if (!data.Media) return { relations: [], recommendations: [] };

  const relations = mapRelationEdges(data.Media.relations?.edges || []);
  const seen = new Set(relations.map((r) => r.id));
  seen.add(id);
  const recommendations = mapRecommendations(
    data.Media.recommendations?.nodes || [],
    seen,
  );
  return { relations, recommendations };
}

/** Flat list (detail page / simple fallback) */
export async function fetchRelationsOnly(id: number): Promise<AnimeRelation[]> {
  const { relations, recommendations } = await fetchMediaLinks(id);
  return [...relations, ...recommendations];
}

/**
 * Multi-hop ancestry graph:
 * - hop 0: official relations + recommendations from center
 * - hop 1+: recommendations-of-recommendations (and edges between them)
 */
export async function fetchAncestryGraph(
  rootId: number,
  opts?: { hopRecLimit?: number; maxNodes?: number },
): Promise<{ nodes: GraphNode[]; edges: GraphEdge[] }> {
  const hopRecLimit = opts?.hopRecLimit ?? 5;
  const maxNodes = opts?.maxNodes ?? 36;

  const nodeMap = new Map<number, GraphNode>();
  const edges: GraphEdge[] = [];
  const edgeKey = new Set<string>();

  const addEdge = (
    from: number,
    to: number,
    kind: GraphEdge["kind"],
    label?: string,
  ) => {
    if (from === to) return;
    const a = Math.min(from, to);
    const b = Math.max(from, to);
    const k = `${kind}:${a}-${b}`;
    if (edgeKey.has(k)) return;
    edgeKey.add(k);
    edges.push({ from, to, kind, label });
  };

  const addNode = (n: AnimeRelation, depth: number, layer: GraphNode["layer"]) => {
    if (nodeMap.has(n.id)) return false;
    if (nodeMap.size >= maxNodes) return false;
    nodeMap.set(n.id, { ...n, depth, layer });
    return true;
  };

  const root = await fetchMediaLinks(rootId);

  for (const r of root.relations) {
    if (addNode(r, 0, "official")) {
      addEdge(rootId, r.id, "official", r.relationType);
    }
  }
  for (const r of root.recommendations) {
    if (addNode(r, 0, "recommended")) {
      addEdge(rootId, r.id, "recommended", "RECOMMENDED");
    }
  }

  // Expand recommendations of first-hop recommendations
  const hop0Recs = root.recommendations.slice(0, hopRecLimit);
  const expansions = await Promise.all(
    hop0Recs.map(async (rec) => {
      try {
        const links = await fetchMediaLinks(rec.id);
        return { parentId: rec.id, links };
      } catch {
        return { parentId: rec.id, links: { relations: [], recommendations: [] } };
      }
    }),
  );

  for (const { parentId, links } of expansions) {
    // A few official links from hop-1 titles help density without noise
    for (const r of links.relations.slice(0, 2)) {
      if (r.id === rootId) continue;
      if (!nodeMap.has(r.id)) {
        if (!addNode({ ...r, relationType: r.relationType }, 1, "official")) continue;
      }
      addEdge(parentId, r.id, "official", r.relationType);
    }
    for (const r of links.recommendations.slice(0, hopRecLimit)) {
      if (r.id === rootId) continue;
      const isNew = !nodeMap.has(r.id);
      if (isNew) {
        if (!addNode({ ...r, relationType: "RECOMMENDED" }, 1, "recommended")) {
          continue;
        }
      }
      addEdge(parentId, r.id, "recommended", "RECOMMENDED");
    }
  }

  return {
    nodes: [...nodeMap.values()],
    edges,
  };
}
