import Link from "next/link";

export default function MoodNotFound() {
  return (
    <main className="container" style={{ padding: "64px 24px", textAlign: "center" }}>
      <h1 style={{ fontFamily: "var(--font-display)", fontSize: "2rem", marginBottom: 12 }}>
        Unknown frequency
      </h1>
      <p style={{ color: "var(--color-text-muted)", marginBottom: 24 }}>
        That mood isn’t on the dial. Try another signal from home.
      </p>
      <Link href="/" className="btn btn-accent btn-sm">
        Back home
      </Link>
    </main>
  );
}
