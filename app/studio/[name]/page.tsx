import Link from "next/link";
import { fetchFiltered } from "@/lib/anilist";
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
    title: `${label} · Studio desk · AnimeNexus`,
    description: `Titles associated with ${label} — soft catalog desk.`,
  };
}

export default async function StudioDeskPage({ params }: Props) {
  const { name } = await params;
  const label = decodeURIComponent(name).replace(/\+/g, " ").trim();

  let error: string | null = null;
  let items: Awaited<ReturnType<typeof fetchFiltered>>["data"] = [];

  try {
    // Studio filter when supported; search fallback for title/studio text
    const page = await fetchFiltered(
      {
        search: label,
        studio: label,
        sort: "score",
        adultFilter: "exclude",
      },
      1,
      24,
    );
    items = page.data.filter((a) =>
      (a.studios || []).some((s) =>
        s.toLowerCase().includes(label.toLowerCase()),
      ),
    );
    // If studio metadata sparse, fall back to search hits
    if (items.length < 3) {
      items = page.data;
    }
  } catch (e) {
    error = e instanceof Error ? e.message : "Catalog unreachable";
  }

  return (
    <main>
      <section className="hero" style={{ paddingBottom: 16 }}>
        <div className="container">
          <div className="hero-badge">Studio desk</div>
          <h1>
            <span>{label}</span>
          </h1>
          <p className="meta">
            Soft studio surface — not a complete filmography. Prefer titles
            tagged with this studio when the catalog allows.
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
            <p>No titles matched this studio desk right now.</p>
          </div>
        ) : (
          <AnimeGrid items={items} trackBehaviour />
        )}
      </section>
    </main>
  );
}
