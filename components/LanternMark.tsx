/**
 * AnimeNexus brand mark — lantern + nexus ring.
 * SVG only. Use in intro, favicon source, and future nav alignment.
 */
type Props = {
  className?: string;
  /** Decorative by default */
  title?: string;
};

export function LanternMark({ className, title }: Props) {
  return (
    <svg
      className={className}
      viewBox="0 0 64 80"
      width="64"
      height="80"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      role={title ? "img" : "presentation"}
      aria-hidden={title ? undefined : true}
      aria-label={title}
    >
      {/* Bail / handle */}
      <path
        d="M22 14c0-7 5.5-12 10-12s10 5 10 12"
        stroke="currentColor"
        strokeWidth="2.4"
        strokeLinecap="round"
        opacity="0.9"
      />
      {/* Cap */}
      <path
        d="M16 18h32l-3 6H19l-3-6z"
        fill="currentColor"
        opacity="0.85"
      />
      {/* Shell */}
      <rect
        x="14"
        y="24"
        width="36"
        height="42"
        rx="7"
        stroke="currentColor"
        strokeWidth="2"
        fill="url(#nxLanternShell)"
      />
      {/* Side vents */}
      <path
        d="M18 34h4M42 34h4M18 44h4M42 44h4"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        opacity="0.55"
      />
      {/* Nexus ring */}
      <circle
        cx="32"
        cy="44"
        r="11"
        stroke="url(#nxLanternRing)"
        strokeWidth="1.5"
        opacity="0.9"
      />
      {/* Core flame */}
      <circle cx="32" cy="44" r="5" fill="url(#nxLanternCore)" />
      {/* Soft outer glow */}
      <circle
        cx="32"
        cy="44"
        r="8"
        fill="url(#nxLanternGlow)"
        opacity="0.55"
      />
      {/* Base */}
      <path
        d="M18 66h28l-2 6H20l-2-6z"
        fill="currentColor"
        opacity="0.8"
      />
      <defs>
        <radialGradient id="nxLanternCore" cx="35%" cy="30%" r="70%">
          <stop offset="0%" stopColor="#fff6e8" />
          <stop offset="45%" stopColor="#ffe5b4" />
          <stop offset="100%" stopColor="#e8a598" />
        </radialGradient>
        <radialGradient id="nxLanternGlow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#f2c891" stopOpacity="0.55" />
          <stop offset="100%" stopColor="#e8a598" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="nxLanternShell" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#e8a598" stopOpacity="0.14" />
          <stop offset="100%" stopColor="#e8a598" stopOpacity="0.03" />
        </linearGradient>
        <linearGradient id="nxLanternRing" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#ffe8d9" />
          <stop offset="100%" stopColor="#e8a598" />
        </linearGradient>
      </defs>
    </svg>
  );
}
