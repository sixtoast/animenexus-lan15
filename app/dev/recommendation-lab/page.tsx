import { RecommendationLab } from "@/components/dev/RecommendationLab";
import "./recommendation-lab.css";

export const metadata = {
  title: "Recommendation Lab · AnimeNexus",
  description:
    "Dev tool — inspect fingerprint user model, clusters, drift, contradictions",
  robots: { index: false, follow: false },
};

export default function RecommendationLabPage() {
  return (
    <main className="container" style={{ paddingTop: 24, paddingBottom: 48 }}>
      <h1>Recommendation Lab</h1>
      <p className="tools-hint">
        Development-only inspector for Recommendation Intelligence V3. Switch
        between your browser shelf and synthetic personas. Not linked from
        production navigation.
      </p>
      <RecommendationLab />
    </main>
  );
}
