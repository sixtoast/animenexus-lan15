import Link from "next/link";

export default function AnimeNotFound() {
  return (
    <main className="container" style={{ padding: "64px 24px", textAlign: "center" }}>
      <h1 style={{ fontFamily: "var(--font-display)", fontSize: "2rem", marginBottom: 12 }}>
        Signal lost
      </h1>
      <p style={{ color: "var(--color-text-muted)", marginBottom: 24 }}>
        That title isn’t on this frequency — or AniList didn’t answer.
      </p>
      <Link href="/browse" className="btn btn-accent btn-sm">
        Back to browse
      </Link>
    </main>
  );
}
