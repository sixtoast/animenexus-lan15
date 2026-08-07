import { AccountClient } from "@/components/AccountClient";
import "./account.css";

export const metadata = {
  title: "Account · AnimeNexus",
  description:
    "Connect a public AniList username and sync lists into your local watchlist.",
};

export default function AccountPage() {
  return (
    <main>
      <section className="hero" style={{ paddingBottom: 12 }}>
        <div className="container">
          <div className="hero-badge">Account · Sprint 6</div>
          <h1>
            AniList <span>link</span>
          </h1>
          <p>
            Enter a public username to import watching / planning / completed
            lists into this browser’s watchlist. No OAuth app required for this
            sprint.
          </p>
        </div>
      </section>
      <section
        className="container"
        style={{ paddingBottom: 48, maxWidth: 720 }}
      >
        <AccountClient />
      </section>
    </main>
  );
}
