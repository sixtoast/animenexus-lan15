import Link from "next/link";
import { searchAnime } from "@/lib/anilist";
import { AnimeGrid } from "@/components/AnimeGrid";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ name: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { name } = await params;
  const label = decodeURIComponent(name).replace(/\+/g, " ");
  return {
    title: `${label} · Staff desk · AnimeNexus`,
    description: `Soft catalog desk for credits related to ${label}.`,
  };
}

/**
 * Soft staff desk — catalog search by person name.
 * Not a complete filmography; providers rarely expose staff-as-filter cleanly.
 */
export default async function StaffDeskPage({ params }: Props) {
  const { name } = await params;
  const label = decodeURIComponent(name).replace(/\+/g, " ").trim();

  let error: string | null = null;
  let items: Awaited<ReturnType<typeof searchAnime>>["data"] = [];

  try {
    const page = await searchAnime(label, 1, 24);
    items = page.data;
  } catch (e) {
    error = e instanceof Error ? e.message : "Catalog unreachable";
  }

  return (
    <main>
      <section className="hero" style={{ paddingBottom: 16 }}>
        <div className="container">
          <div className="hero-badge">Staff desk</div>
          <h1>
            <span>{label}</span>
          </h1>
          <p className="meta">
            Soft surface from title search — not a verified filmography. Cross-check
            credits on detail pages.
          </p>
          <p style={{ marginTop: 12 }}>
            <Link href="/browse" className="btn btn-outline btn-sm">
              ← Browse
            </Link>
          </p>
        </div>
      </section>
      <section className="container" style={{ paddingBottom: 48 }}>
        {error ? (
          <div className="state-box error">
            <p>{error}</p>
          </div>
        ) : items.length === 0 ? (
          <div className="state-box">
            <p>No titles matched this name in the catalog right now.</p>
          </div>
        ) : (
          <AnimeGrid items={items} trackBehaviour />
        )}
      </section>
    </main>
  );
}
