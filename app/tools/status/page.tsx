import type { Metadata } from "next";
import Link from "next/link";
import { DeskShell } from "@/components/DeskShell";
import { ProviderStatusPanel } from "@/components/ProviderStatusPanel";
import "../tools.css";

export const metadata: Metadata = {
  title: "Provider status · AnimeNexus",
  description: "Optional API gates — soft-fail configuration snapshot.",
};

export default function ProviderStatusPage() {
  return (
    <main>
      <section className="hero" style={{ paddingBottom: 12 }}>
        <div className="container">
          <div className="hero-badge">Night Desk · health</div>
          <h1>
            <span>Provider status</span>
          </h1>
          <p>
            Expansion II enrichment layers. Unconfigured providers return empty
            data — catalog never depends on them.
          </p>
        </div>
      </section>
      <section className="container" style={{ paddingBottom: 48 }}>
        <DeskShell title="Status" personality="generic">
          <ProviderStatusPanel />
          <div style={{ marginTop: 28 }}>
            <h2 className="nx-kicker" style={{ marginBottom: 10 }}>
              Smoke paths
            </h2>
            <ul className="theme-ul">
              <li>
                <Link href="/browse">Browse</Link> — works with AniList only
              </li>
              <li>
                <Link href="/tools/radar">Radar</Link> — schedule + signals
              </li>
              <li>
                <Link href="/tools/signals">Signals inbox</Link> — local history
              </li>
              <li>
                <Link href="/account">Account</Link> — OAuth, My Services,
                notifications
              </li>
              <li>
                <Link href="/airing">Airing</Link> — schedule + ICS export
              </li>
            </ul>
            <p className="tools-hint" style={{ marginTop: 12 }}>
              Docs:{" "}
              <code>docs/API_EXPANSION_II_SOFT_FAIL.md</code> ·{" "}
              <code>docs/API_EXPANSION_II_CHECKLIST.md</code> ·{" "}
              <code>docs/ENV_AND_APIS.md</code>
            </p>
          </div>
        </DeskShell>
      </section>
    </main>
  );
}
