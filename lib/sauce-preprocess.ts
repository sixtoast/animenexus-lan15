/**
 * Sauce screenshot preprocess (Creative Sprint 15).
 *
 * local preview → canvas redraw (strips EXIF) → resize/compress → FormData.
 * No Cloudinary retention — file goes straight to /api/sauce → trace.moe.
 */

export type SaucePreprocessResult = {
  file: File;
  previewUrl: string;
  width: number;
  height: number;
  bytes: number;
};

const MAX_EDGE = 1280;
const JPEG_QUALITY = 0.85;

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Could not read image"));
    };
    img.src = url;
  });
}

/**
 * Redraw on canvas → drops EXIF/orientation metadata, resizes long edge,
 * encodes as JPEG (or PNG if transparency likely).
 */
export async function preprocessSauceFile(
  file: File,
  opts?: { maxEdge?: number; quality?: number },
): Promise<SaucePreprocessResult> {
  const maxEdge = opts?.maxEdge ?? MAX_EDGE;
  const quality = opts?.quality ?? JPEG_QUALITY;

  const img = await loadImage(file);
  let { width, height } = img;

  const long = Math.max(width, height);
  if (long > maxEdge) {
    const scale = maxEdge / long;
    width = Math.max(1, Math.round(width * scale));
    height = Math.max(1, Math.round(height * scale));
  }

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas unavailable");

  ctx.drawImage(img, 0, 0, width, height);

  const preferPng =
    file.type === "image/png" || file.type === "image/webp";
  const mime = preferPng ? "image/jpeg" : "image/jpeg";

  const blob: Blob = await new Promise((resolve, reject) => {
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error("Encode failed"))),
      mime,
      quality,
    );
  });

  const outName = (file.name || "frame").replace(/\.[^.]+$/, "") + ".jpg";
  const out = new File([blob], outName, { type: mime });
  const previewUrl = URL.createObjectURL(out);

  return {
    file: out,
    previewUrl,
    width,
    height,
    bytes: out.size,
  };
}
