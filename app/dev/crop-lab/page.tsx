import { CropLab } from "@/components/media/CropLab";
import "./crop-lab.css";

export const metadata = {
  title: "Crop Lab · AnimeNexus",
  description: "Dev tool — inspect Cloudinary crop variants and focal points",
  robots: { index: false, follow: false },
};

export default function CropLabPage() {
  return (
    <main className="container" style={{ paddingTop: 24, paddingBottom: 48 }}>
      <h1>Crop Lab</h1>
      <p className="tools-hint">
        Development tool (Sprint 14). Compares context crops for a Cloudinary
        public ID and stores focal overrides in this browser.
      </p>
      <CropLab />
    </main>
  );
}
