"use client";

import {
  getIconDef,
  type NexusIconName,
} from "@/lib/icons/registry";
import { hasLocalSvg, ICON_SVG, ICON_VIEWBOX } from "@/lib/icons/svg";

export type NexusIconProps = {
  name: NexusIconName;
  /** Accessible label — omit when parent provides text */
  label?: string;
  /** Decorative (aria-hidden) when true */
  decorative?: boolean;
  className?: string;
  size?: "sm" | "md" | "lg";
};

/**
 * Semantic icon (Sprints 19–20).
 * Local SVG when bundled; unicode glyph fallback otherwise.
 * Never hits Iconify CDN at runtime.
 */
export function NexusIcon({
  name,
  label,
  decorative = true,
  className = "",
  size = "md",
}: NexusIconProps) {
  const def = getIconDef(name);
  const aria = decorative ? undefined : label || def.label;
  const local = hasLocalSvg(name);

  return (
    <span
      className={`nx-icon nx-icon--${size} ${className}`.trim()}
      data-icon={name}
      data-icon-class={def.class}
      data-icon-src={local ? "svg" : "glyph"}
      role={decorative ? undefined : "img"}
      aria-label={aria}
      aria-hidden={decorative ? true : undefined}
      title={decorative ? undefined : aria}
    >
      {local ? (
        <svg
          className="nx-icon-svg"
          viewBox={ICON_VIEWBOX}
          width="1em"
          height="1em"
          aria-hidden
          focusable="false"
        >
          {ICON_SVG[name]}
        </svg>
      ) : (
        <span className="nx-icon-glyph">{def.glyph}</span>
      )}
    </span>
  );
}

export type { NexusIconName };
