"use client";

import {
  getIconDef,
  type NexusIconName,
} from "@/lib/icons/registry";

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
 * Semantic icon (Creative Sprint 19).
 * Request product names (`home`, `shelf`, `radar`) — never vendor ids.
 * Interim glyphs from registry; Sprint 20–21 swap in local SVG.
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

  return (
    <span
      className={`nx-icon nx-icon--${size} ${className}`.trim()}
      data-icon={name}
      data-icon-class={def.class}
      role={decorative ? undefined : "img"}
      aria-label={aria}
      aria-hidden={decorative ? true : undefined}
      title={decorative ? undefined : aria}
    >
      <span className="nx-icon-glyph">{def.glyph}</span>
    </span>
  );
}

export type { NexusIconName };
