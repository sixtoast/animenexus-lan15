"use client";

import type { ShelfRelationship } from "@/lib/shelf-resonance";
import { proximityBand } from "@/lib/shelf-resonance";
import { ModelDisclosure } from "@/components/ModelDisclosure";

export function ShelfResonancePanel({
  rel,
  onClear,
}: {
  rel: ShelfRelationship;
  onClear: () => void;
}) {
  const band = proximityBand(rel.resonanceOverlap);
  const pct = Math.round(rel.resonanceOverlap * 100);

  return (
    <aside
      className="shelf-resonance-panel"
      data-proximity={band}
      aria-label="Resonance relationship"
    >
      <div className="shelf-res-head">
        <p className="nx-kicker">Resonance compare</p>
        <button type="button" className="btn btn-outline btn-sm" onClick={onClear}>
          Clear pair
        </button>
      </div>
      <h3 className="shelf-res-titles">
        {rel.titleA} <span aria-hidden>·</span> {rel.titleB}
      </h3>
      <p className="shelf-res-meter" role="status">
        <span className="shelf-res-pct">{pct}%</span>
        <span className="tools-hint"> model overlap · {band}</span>
      </p>
      <div className="shelf-res-bar" aria-hidden>
        <span style={{ width: `${pct}%` }} />
      </div>

      <div className="shelf-res-cols">
        <div>
          <h4>Metadata (facts from shelf)</h4>
          <ul>
            {rel.factLines.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
        </div>
        <div>
          <h4>AnimeNexus reading (model)</h4>
          <ul>
            {rel.modelLines.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
        </div>
      </div>
      <ModelDisclosure compact />
    </aside>
  );
}
