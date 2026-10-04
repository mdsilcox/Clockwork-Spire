// The Workshop room, drawn in code: lamplit wall, a window onto the Spire, a workbench, pinned notes and a corgi bed.
export function RoomArt() {
  return (
    <svg class="roomart" viewBox="0 0 280 300" preserveAspectRatio="xMidYMid slice" aria-hidden="true" focusable="false">
      <defs>
        <linearGradient id="wall" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stop-color="#3b2a1c" />
          <stop offset="1" stop-color="#2a1d13" />
        </linearGradient>
        <linearGradient id="dusk" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stop-color="#2b3350" />
          <stop offset="0.6" stop-color="#8a5a4a" />
          <stop offset="1" stop-color="#d9a05a" />
        </linearGradient>
        <radialGradient id="lampglow" cx="0.5" cy="0.35" r="0.65">
          <stop offset="0" stop-color="#ffd27a" stop-opacity="0.55" />
          <stop offset="1" stop-color="#ffd27a" stop-opacity="0" />
        </radialGradient>
        <linearGradient id="boards" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stop-color="#4a3322" />
          <stop offset="1" stop-color="#2c1f14" />
        </linearGradient>
      </defs>
      <rect width="280" height="300" fill="url(#wall)" />
      {/* floor */}
      <rect y="230" width="280" height="70" fill="url(#boards)" />
      <path d="M0 250 H280 M0 272 H280 M60 230 V250 M170 250 V272 M240 230 V250 M110 272 V300 M220 272 V300" stroke="#1d150e" stroke-width="2" opacity="0.6" />
      {/* window onto the Spire */}
      <g transform="translate(14 36)">
        <rect width="120" height="100" rx="6" fill="url(#dusk)" stroke="#8a6a2a" stroke-width="6" />
        <path d="M0 100 L0 78 L16 74 L22 60 L30 74 L52 70 L60 20 L64 10 L68 20 L72 70 L100 76 L120 72 L120 100 Z" fill="#1d150e" opacity="0.92" />
        <circle cx="64" cy="34" r="7" fill="#ffd27a" opacity="0.9" />
        <path d="M64 34 V29 M64 34 L67 36" stroke="#2a1c08" stroke-width="1.5" stroke-linecap="round" />
        <path d="M60 0 V100 M0 50 H120" stroke="#8a6a2a" stroke-width="4" />
        <circle cx="96" cy="16" r="2" fill="#fff2cc" opacity="0.8" />
        <circle cx="20" cy="22" r="1.5" fill="#fff2cc" opacity="0.7" />
      </g>
      {/* pinned notes */}
      <g>
        <g transform="translate(146 34) rotate(-4)">
          <rect width="44" height="54" fill="#e8d9b0" />
          <path d="M6 12 H38 M6 22 H34 M6 32 H38 M6 42 H26" stroke="#8a6a2a" stroke-width="2" />
          <circle cx="22" cy="4" r="3" fill="#c4703f" />
        </g>
        <g transform="translate(198 46) rotate(3)">
          <rect width="40" height="46" fill="#d8c898" />
          <path d="M6 12 H34 M6 22 H30 M6 32 H34" stroke="#8a6a2a" stroke-width="2" />
          <circle cx="20" cy="4" r="3" fill="#6fb0a6" />
        </g>
        <g transform="translate(170 100) rotate(-2)">
          <rect width="52" height="38" fill="#ecdcb4" />
          <path d="M8 12 L24 24 L40 10" stroke="#c4703f" stroke-width="2.5" fill="none" />
          <circle cx="26" cy="4" r="3" fill="#d1a64a" />
        </g>
      </g>
      {/* hanging lamp and its glow */}
      <rect x="-40" y="-20" width="360" height="260" fill="url(#lampglow)" />
      <path d="M140 0 V28" stroke="#8a6a2a" stroke-width="3" />
      <path d="M124 46 Q140 22 156 46 Z" fill="#c4703f" stroke="#7d4524" stroke-width="2" />
      <circle cx="140" cy="48" r="5" fill="#ffd27a" />
      {/* workbench */}
      <g transform="translate(10 150)">
        <rect x="0" y="40" width="190" height="14" rx="3" fill="#6b4a2c" stroke="#3b2a1c" stroke-width="2" />
        <rect x="10" y="54" width="10" height="80" fill="#4a3322" />
        <rect x="170" y="54" width="10" height="80" fill="#4a3322" />
        <rect x="14" y="28" width="30" height="12" rx="2" fill="#7e8b92" />
        <path d="M20 28 V18 H38 V28" fill="none" stroke="#7e8b92" stroke-width="4" />
        <circle cx="86" cy="32" r="11" fill="none" stroke="#d1a64a" stroke-width="3" />
        <path d="M86 18 V22 M86 42 V46 M72 32 H76 M96 32 H100 M76 22 L79 25 M93 39 L96 42 M96 22 L93 25 M79 39 L76 42" stroke="#d1a64a" stroke-width="3" stroke-linecap="round" />
        <circle cx="86" cy="32" r="3" fill="#d1a64a" />
        <circle cx="122" cy="35" r="7" fill="none" stroke="#c4703f" stroke-width="3" />
        <path d="M122 26 V29 M122 41 V44 M113 35 H116 M128 35 H131" stroke="#c4703f" stroke-width="3" stroke-linecap="round" />
        <path d="M148 40 L156 24 L164 40 Z" fill="#ffb84d" opacity="0.9" />
      </g>
      {/* the corgi bed */}
      <g transform="translate(150 236)">
        <ellipse cx="62" cy="40" rx="66" ry="20" fill="#2a1a10" />
        <ellipse cx="62" cy="32" rx="62" ry="18" fill="#7d4524" stroke="#4a2a14" stroke-width="3" />
        <ellipse cx="62" cy="31" rx="46" ry="11" fill="#a05a2e" />
        <path d="M20 30 Q62 44 104 30" fill="none" stroke="#c4703f" stroke-width="2" opacity="0.7" />
      </g>
      {/* a rug */}
      <ellipse cx="110" cy="270" rx="80" ry="12" fill="#5a2f22" opacity="0.7" />
    </svg>
  );
}
