export default function DetailLoading() {
  return (
    <main>
      <div className="detail-banner detail-banner-empty" />
      <div className="container detail-wrap" style={{ paddingTop: 24 }}>
        <p className="tuning-label">Opening the lantern…</p>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "minmax(140px, 220px) 1fr",
            gap: 24,
            alignItems: "start",
          }}
        >
          <div className="poster-skel" style={{ maxWidth: 220 }} />
          <div>
            <div
              className="poster-skel"
              style={{ height: 28, aspectRatio: "auto", marginBottom: 12 }}
            />
            <div
              className="poster-skel"
              style={{ height: 14, width: "60%", aspectRatio: "auto", marginBottom: 8 }}
            />
            <div
              className="poster-skel"
              style={{ height: 14, width: "40%", aspectRatio: "auto" }}
            />
          </div>
        </div>
      </div>
    </main>
  );
}
