/* ORDENPOS Logo Component — Golden list icon with checkmark */
export default function OrdenposLogo({ size = 48, className = '' }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <defs>
        <linearGradient id="goldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%"   stopColor="#FFE033" />
          <stop offset="40%"  stopColor="#FFD700" />
          <stop offset="70%"  stopColor="#D4A800" />
          <stop offset="100%" stopColor="#FFD700" />
        </linearGradient>
        <linearGradient id="iconGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%"   stopColor="#1a1100" />
          <stop offset="100%" stopColor="#3d2900" />
        </linearGradient>
        <filter id="logoShadow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="2" stdDeviation="3" floodColor="#ffd700" floodOpacity="0.45" />
        </filter>
      </defs>

      {/* Container rounded square */}
      <rect x="2" y="2" width="44" height="44" rx="12" fill="url(#goldGrad)" filter="url(#logoShadow)" />

      {/* List lines */}
      <rect x="18" y="14" width="16" height="2.5" rx="1.25" fill="url(#iconGrad)" opacity="0.85" />
      <rect x="18" y="21" width="12" height="2.5" rx="1.25" fill="url(#iconGrad)" opacity="0.85" />
      <rect x="18" y="28" width="10" height="2.5" rx="1.25" fill="url(#iconGrad)" opacity="0.85" />

      {/* Bullet dots */}
      <circle cx="13.5" cy="15.25" r="2"   fill="url(#iconGrad)" opacity="0.9" />
      <circle cx="13.5" cy="22.25" r="2"   fill="url(#iconGrad)" opacity="0.9" />
      <circle cx="13.5" cy="29.25" r="2"   fill="url(#iconGrad)" opacity="0.9" />

      {/* Checkmark badge */}
      <circle cx="35" cy="35" r="8" fill="#000" opacity="0.35" />
      <circle cx="35" cy="35" r="7" fill="url(#iconGrad)" />
      <polyline
        points="31,35 34,38 39,32"
        stroke="#FFD700"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </svg>
  )
}
