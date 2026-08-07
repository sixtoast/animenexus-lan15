export default function BrowseLoading() {
  return (
    <main>
      <section className="hero" style={{ paddingBottom: 12 }}>
        <div className="container">
          <div className="hero-badge">Catalog</div>
          <h1>Browse</h1>
          <p className="tuning-label">Tuning the frequency…</p>
        </div>
      </section>
      <section className="container" style={{ paddingBottom: 48 }}>
        <div className="poster-skel-grid" aria-hidden>
          {Array.from({ length: 12 }).map((_, i) => (
            <div key={i} className="poster-skel" />
          ))}
        </div>
      </section>
    </main>
  );
}
