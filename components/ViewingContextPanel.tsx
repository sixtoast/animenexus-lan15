import type { ViewingContext } from "@/lib/viewing-context";

type Props = {
  context: ViewingContext;
};

export function ViewingContextPanel({ context }: Props) {
  if (!context.chips.length) return null;

  return (
    <section className="detail-section" aria-labelledby="context-heading">
      <h2 id="context-heading">Context</h2>
      {context.summary ? (
        <p className="tools-hint" style={{ marginBottom: 12 }}>
          {context.summary}
        </p>
      ) : (
        <p className="tools-hint" style={{ marginBottom: 12 }}>
          Soft framing from catalog fields — not a watch-order rule.
        </p>
      )}
      <div className="detail-tags" style={{ flexWrap: "wrap" }}>
        {context.chips.map((c) => (
          <span
            key={c.id}
            className="detail-tag"
            title={c.note || undefined}
            style={{ cursor: "default" }}
          >
            {c.label}
          </span>
        ))}
      </div>
    </section>
  );
}
