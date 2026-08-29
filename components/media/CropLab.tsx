"use client";

import { useMemo, useState } from "react";
import {
  buildCloudinaryUrl,
  isCloudinaryConfigured,
} from "@/lib/media/cloudinary";
import {
  cropVariantsFor,
  getFocalPoint,
  setFocalPoint,
  type FocalPoint,
} from "@/lib/media/crop";

/**
 * Dev / admin crop inspector (Creative Sprint 14).
 * Only useful when NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME is set.
 */
export function CropLab({
  initialPublicId = "nexus/samples/poster",
}: {
  initialPublicId?: string;
}) {
  const [publicId, setPublicId] = useState(initialPublicId);
  const [fx, setFx] = useState(0.5);
  const [fy, setFy] = useState(0.5);
  const configured = isCloudinaryConfigured();

  const variants = useMemo(() => cropVariantsFor(publicId.trim()), [publicId]);

  function applyFocal() {
    const focal: FocalPoint = { x: fx, y: fy };
    setFocalPoint(publicId.trim(), focal);
  }

  function clearFocal() {
    setFocalPoint(publicId.trim(), null);
  }

  const stored = getFocalPoint(publicId.trim());

  if (!configured) {
    return (
      <div className="state-box">
        <p>
          CropLab needs <code>NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME</code>.
        </p>
      </div>
    );
  }

  return (
    <div className="nx-crop-lab">
      <label className="nx-crop-lab-field">
        Public ID
        <input
          className="filter-input"
          value={publicId}
          onChange={(e) => setPublicId(e.target.value)}
        />
      </label>

      <div className="nx-crop-lab-focal">
        <label>
          Focal X (0–1)
          <input
            type="number"
            className="filter-input"
            min={0}
            max={1}
            step={0.01}
            value={fx}
            onChange={(e) => setFx(parseFloat(e.target.value) || 0)}
          />
        </label>
        <label>
          Focal Y (0–1)
          <input
            type="number"
            className="filter-input"
            min={0}
            max={1}
            step={0.01}
            value={fy}
            onChange={(e) => setFy(parseFloat(e.target.value) || 0)}
          />
        </label>
        <button type="button" className="btn btn-accent btn-sm" onClick={applyFocal}>
          Save focal
        </button>
        <button type="button" className="btn btn-outline btn-sm" onClick={clearFocal}>
          Clear focal
        </button>
        {stored ? (
          <span className="tools-hint">
            Stored: {stored.x.toFixed(2)}, {stored.y.toFixed(2)}
          </span>
        ) : (
          <span className="tools-hint">No focal override</span>
        )}
      </div>

      <div className="nx-crop-lab-grid">
        {variants.map((v) => {
          const url = buildCloudinaryUrl({
            publicId: publicId.trim(),
            transform: v.transform,
          });
          return (
            <figure key={v.label} className="nx-crop-lab-card">
              <figcaption>{v.label}</figcaption>
              {url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={url} alt={v.label} loading="lazy" />
              ) : (
                <div className="nx-crop-lab-missing">—</div>
              )}
              <code className="nx-crop-lab-tx">{v.transform}</code>
            </figure>
          );
        })}
      </div>
    </div>
  );
}
