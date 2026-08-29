/**
 * Session Cover Generator 2.0 (Creative Sprint 16).
 * Curated editorial layouts, deterministic from session data.
 * Canvas composition — Cloudinary optional for artwork fetch only.
 */

import type { WatchlistEntry } from "./types";
import {
  describeUserResonance,
  topResonanceDims,
  userResonance,
} from "./resonance";

export type SessionCoverRatio =
  | "portrait"
  | "square"
  | "landscape"
  | "og";

export type SessionCoverLayout =
  | "desk"
  | "signal"
  | "shelf"
  | "lantern"
  | "minimal";

export const COVER_SIZES: Record<
  SessionCoverRatio,
  { width: number; height: number; label: string }
> = {
  portrait: { width: 1080, height: 1350, label: "Portrait social" },
  square: { width: 1080, height: 1080, label: "Square" },
  landscape: { width: 1920, height: 1080, label: "Landscape" },
  og: { width: 1200, height: 630, label: "Open Graph" },
};

export type SessionCoverInput = {
  entries: WatchlistEntry[];
  /** Optional observation line from Lantern */
  observation?: string;
  date?: Date;
  /** Minutes if known */
  durationMinutes?: number;
};

export type SessionCoverModel = {
  layout: SessionCoverLayout;
  ratio: SessionCoverRatio;
  title: string;
  subtitle: string;
  dateLabel: string;
  statsLine: string;
  observation: string;
  resonanceLine: string;
  /** Up to 3 cover image URLs for shelf layout */
  coverUrls: string[];
  accent: string;
};

const LAYOUTS: SessionCoverLayout[] = [
  "desk",
  "signal",
  "shelf",
  "lantern",
  "minimal",
];

/** Deterministic layout from shelf fingerprint */
export function pickSessionCoverLayout(
  entries: WatchlistEntry[],
): SessionCoverLayout {
  if (entries.length === 0) return "minimal";
  if (entries.length >= 3) {
    const seed = entries
      .slice(0, 8)
      .map((e) => e.id)
      .join("-");
    let h = 0;
    for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
    return LAYOUTS[h % LAYOUTS.length];
  }
  if (entries.length === 1) return "desk";
  return "signal";
}

export function buildSessionCoverModel(
  input: SessionCoverInput,
  ratio: SessionCoverRatio = "og",
): SessionCoverModel {
  const date = input.date || new Date();
  const entries = input.entries || [];
  const layout = pickSessionCoverLayout(entries);
  const vec = userResonance(entries);
  const tops = topResonanceDims(vec, 3);
  const resonanceLine =
    tops.length > 0
      ? tops.map((d) => d.replace(/([A-Z])/g, " $1").trim()).join(" · ")
      : "Quiet frequency";

  const watching = entries.filter((e) => e.watchStatus === "watching").length;
  const completed = entries.filter((e) => e.watchStatus === "completed").length;
  const statsLine = [
    `${entries.length} sealed`,
    watching ? `${watching} watching` : null,
    completed ? `${completed} completed` : null,
    input.durationMinutes
      ? `${Math.round(input.durationMinutes)} min session`
      : null,
  ]
    .filter(Boolean)
    .join(" · ");

  const coverUrls = entries
    .filter((e) => e.image)
    .slice(0, 3)
    .map((e) => e.image);

  const observation =
    input.observation?.trim() ||
    (entries.length
      ? describeUserResonance(vec)
      : "The desk is waiting for a first seal.");

  // Soft accent from shelf size
  const accents = ["#e8a598", "#c4a484", "#9b8b7a", "#d4847a", "#b8a99a"];
  const accent = accents[entries.length % accents.length];

  return {
    layout,
    ratio,
    title: "AnimeNexus",
    subtitle: "Lantern · session",
    dateLabel: date.toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
    }),
    statsLine: statsLine || "Empty shelf",
    observation,
    resonanceLine,
    coverUrls,
    accent,
  };
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  const rr = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
}

async function loadCover(url: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = url;
  });
}

/**
 * Paint session cover onto a canvas. Returns the canvas for toBlob/download.
 */
export async function renderSessionCover(
  model: SessionCoverModel,
): Promise<HTMLCanvasElement> {
  const { width, height } = COVER_SIZES[model.ratio];
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas unavailable");

  // Base
  const g = ctx.createLinearGradient(0, 0, width, height);
  g.addColorStop(0, "#120e0c");
  g.addColorStop(0.55, "#1a1412");
  g.addColorStop(1, "#0e0b0a");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, width, height);

  // Soft accent glow
  const glow = ctx.createRadialGradient(
    width * 0.7,
    height * 0.2,
    0,
    width * 0.7,
    height * 0.2,
    width * 0.55,
  );
  glow.addColorStop(0, model.accent + "33");
  glow.addColorStop(1, "transparent");
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, width, height);

  const pad = Math.round(width * 0.06);
  const titleSize = Math.round(width * 0.055);
  const bodySize = Math.round(width * 0.028);

  ctx.fillStyle = model.accent;
  ctx.font = `600 ${Math.round(bodySize * 0.85)}px Georgia, "Times New Roman", serif`;
  ctx.fillText(model.subtitle, pad, pad + bodySize);

  ctx.fillStyle = "#f5ebe6";
  ctx.font = `600 ${titleSize}px Georgia, "Times New Roman", serif`;
  ctx.fillText(model.title, pad, pad + bodySize + titleSize * 1.15);

  ctx.fillStyle = "rgba(245,235,230,0.72)";
  ctx.font = `400 ${bodySize}px system-ui, sans-serif`;
  ctx.fillText(model.dateLabel, pad, pad + bodySize + titleSize * 1.15 + bodySize * 1.4);

  // Layout-specific
  if (model.layout === "shelf" || model.layout === "desk") {
    const urls = model.coverUrls.slice(0, model.layout === "shelf" ? 3 : 1);
    const imgs = await Promise.all(urls.map(loadCover));
    const slotW = model.layout === "shelf"
      ? Math.round((width - pad * 2 - 24) / Math.max(urls.length, 1))
      : Math.round(width * 0.28);
    const slotH = Math.round(slotW * 1.5);
    const top = Math.round(height * 0.32);
    imgs.forEach((img, i) => {
      if (!img) return;
      const x = pad + i * (slotW + 12);
      roundRect(ctx, x, top, slotW, slotH, 12);
      ctx.save();
      ctx.clip();
      const scale = Math.max(slotW / img.width, slotH / img.height);
      const iw = img.width * scale;
      const ih = img.height * scale;
      ctx.drawImage(img, x + (slotW - iw) / 2, top + (slotH - ih) / 2, iw, ih);
      ctx.restore();
      ctx.strokeStyle = "rgba(240,160,144,0.25)";
      ctx.lineWidth = 2;
      roundRect(ctx, x, top, slotW, slotH, 12);
      ctx.stroke();
    });
  }

  if (model.layout === "signal") {
    const barTop = Math.round(height * 0.38);
    const dims = model.resonanceLine.split(" · ").slice(0, 4);
    dims.forEach((label, i) => {
      const y = barTop + i * Math.round(bodySize * 2.2);
      const bw = Math.round(width * (0.35 + (0.15 * (4 - i)) / 4));
      ctx.fillStyle = model.accent + "55";
      roundRect(ctx, pad, y, bw, Math.round(bodySize * 1.1), 6);
      ctx.fill();
      ctx.fillStyle = "rgba(245,235,230,0.9)";
      ctx.font = `500 ${bodySize}px system-ui, sans-serif`;
      ctx.fillText(label, pad + 10, y + bodySize * 0.9);
    });
  }

  // Footer band
  const footerY = height - pad - bodySize * 4;
  ctx.fillStyle = "rgba(245,235,230,0.9)";
  ctx.font = `500 ${bodySize}px system-ui, sans-serif`;
  ctx.fillText(model.statsLine, pad, footerY);

  ctx.fillStyle = "rgba(245,235,230,0.7)";
  ctx.font = `italic ${bodySize}px Georgia, serif`;
  const obs = model.observation.slice(0, 120);
  wrapText(ctx, obs, pad, footerY + bodySize * 1.6, width - pad * 2, bodySize * 1.35);

  if (model.layout === "lantern" || model.layout === "minimal") {
    ctx.fillStyle = model.accent;
    ctx.font = `500 ${bodySize}px system-ui, sans-serif`;
    ctx.fillText(model.resonanceLine, pad, footerY - bodySize * 1.2);
  }

  // Mark
  ctx.fillStyle = "rgba(245,235,230,0.35)";
  ctx.font = `400 ${Math.round(bodySize * 0.75)}px system-ui, sans-serif`;
  ctx.fillText("animenexus · lantern", pad, height - pad * 0.5);

  return canvas;
}

function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight: number,
) {
  const words = text.split(/\s+/);
  let line = "";
  let yy = y;
  for (const w of words) {
    const test = line ? `${line} ${w}` : w;
    if (ctx.measureText(test).width > maxWidth && line) {
      ctx.fillText(line, x, yy);
      line = w;
      yy += lineHeight;
    } else {
      line = test;
    }
  }
  if (line) ctx.fillText(line, x, yy);
}

export async function downloadSessionCover(
  model: SessionCoverModel,
  filename = "animenexus-session.png",
): Promise<void> {
  const canvas = await renderSessionCover(model);
  await new Promise<void>((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) {
        reject(new Error("Export failed"));
        return;
      }
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = filename;
      a.click();
      URL.revokeObjectURL(a.href);
      resolve();
    }, "image/png");
  });
}
