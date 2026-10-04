// Lamplit vignettes for the node screens, drawn in code in the same brass-and-lamplight style as the rest.
import type { ComponentChildren } from 'preact';

function Scene({ children, label }: { children: ComponentChildren; label: string }) {
  return (
    <svg class="nodescene" viewBox="0 0 240 200" preserveAspectRatio="xMidYMid meet" role="img" aria-label={label}>
      <defs>
        <linearGradient id="nwall" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stop-color="#34261a" />
          <stop offset="1" stop-color="#1f160e" />
        </linearGradient>
        <radialGradient id="nglow" cx="0.5" cy="0.55" r="0.6">
          <stop offset="0" stop-color="#ff9a55" stop-opacity="0.65" />
          <stop offset="1" stop-color="#ff9a55" stop-opacity="0" />
        </radialGradient>
        <radialGradient id="nlamp" cx="0.5" cy="0.2" r="0.7">
          <stop offset="0" stop-color="#ffd27a" stop-opacity="0.5" />
          <stop offset="1" stop-color="#ffd27a" stop-opacity="0" />
        </radialGradient>
      </defs>
      <rect width="240" height="200" fill="url(#nwall)" />
      <rect y="160" width="240" height="40" fill="#2a1d13" />
      <path d="M0 176 H240 M0 190 H240" stroke="#1a120b" stroke-width="2" opacity="0.6" />
      {children}
    </svg>
  );
}

export function ForgeArt() {
  return (
    <Scene label="A forge with an anvil and glowing coals">
      <rect width="240" height="200" fill="url(#nglow)" />
      {/* the hearth */}
      <path d="M20 160 V92 Q20 70 60 66 H180 Q220 70 220 92 V160 Z" fill="#3b2a1c" stroke="#6b4a2c" stroke-width="3" />
      <path d="M52 160 V104 Q52 88 80 86 H160 Q188 88 188 104 V160 Z" fill="#150d08" />
      <path d="M62 160 Q80 120 100 150 Q116 108 134 150 Q150 124 178 160 Z" fill="#ff7a35" />
      <path d="M78 160 Q96 134 110 156 Q124 128 140 156 Q150 142 164 160 Z" fill="#ffd27a" />
      {/* the anvil */}
      <g transform="translate(78 128)">
        <path d="M0 14 H84 C84 24 70 28 60 28 V40 H78 V50 H6 V40 H24 V28 C14 28 2 26 0 14 Z" fill="#7e8b92" stroke="#2f3a40" stroke-width="3" stroke-linejoin="round" />
        <path d="M4 16 H80" stroke="#b9c4c9" stroke-width="2" />
      </g>
      {/* sparks */}
      <g class="sparks">
        <circle cx="106" cy="118" r="2.4" fill="#ffd27a" />
        <circle cx="124" cy="108" r="1.8" fill="#ffb84d" />
        <circle cx="140" cy="122" r="2.2" fill="#fff2cc" />
        <circle cx="96" cy="104" r="1.6" fill="#ff9a55" />
        <circle cx="150" cy="104" r="1.5" fill="#ffd27a" />
      </g>
      {/* a hammer on the wall */}
      <g transform="translate(26 22) rotate(-18)">
        <rect x="0" y="12" width="6" height="40" rx="2" fill="#6b4a2c" />
        <rect x="-8" y="4" width="22" height="12" rx="2" fill="#7e8b92" />
      </g>
    </Scene>
  );
}

export function OilArt() {
  return (
    <Scene label="An oil can dripping on a workbench">
      <rect width="240" height="200" fill="url(#nlamp)" />
      <path d="M120 0 V36" stroke="#8a6a2a" stroke-width="3" />
      <path d="M104 54 Q120 28 136 54 Z" fill="#c4703f" stroke="#7d4524" stroke-width="2" />
      <circle cx="120" cy="56" r="5" fill="#ffd27a" />
      <rect x="20" y="132" width="200" height="14" rx="3" fill="#6b4a2c" stroke="#3b2a1c" stroke-width="2" />
      <rect x="32" y="146" width="10" height="30" fill="#4a3322" />
      <rect x="198" y="146" width="10" height="30" fill="#4a3322" />
      {/* the can */}
      <g transform="translate(78 82)">
        <path d="M0 22 H54 V50 H0 Z" fill="#c9b45a" stroke="#7a6a2a" stroke-width="3" stroke-linejoin="round" />
        <path d="M54 30 L90 6 L94 12 L58 40" fill="#c9b45a" stroke="#7a6a2a" stroke-width="3" stroke-linejoin="round" />
        <path d="M12 22 V10 Q27 -2 42 10 V22" fill="none" stroke="#7a6a2a" stroke-width="4" />
        <path d="M6 28 V44" stroke="#f0e08a" stroke-width="3" opacity="0.7" />
      </g>
      <path class="drip" d="M172 94 Q176 104 172 108 Q168 104 172 94 Z" fill="#d8c25a" />
      <ellipse cx="172" cy="130" rx="10" ry="3" fill="#d8c25a" opacity="0.7" />
      {/* a few gears waiting */}
      <circle cx="46" cy="124" r="8" fill="none" stroke="#d1a64a" stroke-width="3" />
      <circle cx="196" cy="122" r="6" fill="none" stroke="#c4703f" stroke-width="3" />
    </Scene>
  );
}

export function ShopArt() {
  return (
    <Scene label="A shop counter with parts hanging above it">
      <rect width="240" height="200" fill="url(#nlamp)" />
      {/* the awning */}
      <path d="M10 14 H230 V40 Q216 50 202 40 Q188 50 174 40 Q160 50 146 40 Q132 50 118 40 Q104 50 90 40 Q76 50 62 40 Q48 50 34 40 Q22 48 10 40 Z" fill="#7d4524" stroke="#4a2a14" stroke-width="3" />
      <path d="M10 14 H230" stroke="#c4703f" stroke-width="3" />
      {/* hanging parts */}
      <g stroke="#8a6a2a" stroke-width="2">
        <path d="M44 48 V70 M92 48 V80 M140 48 V66 M188 48 V76" />
      </g>
      <g fill="none" stroke-width="3.5" stroke-linecap="round">
        <circle cx="44" cy="82" r="11" stroke="#d1a64a" />
        <circle cx="92" cy="92" r="9" stroke="#6fb0a6" />
        <circle cx="140" cy="78" r="12" stroke="#c4703f" />
        <circle cx="188" cy="88" r="10" stroke="#c2a4dc" />
      </g>
      <g fill="#d1a64a">
        <circle cx="44" cy="82" r="3" />
        <circle cx="92" cy="92" r="3" />
        <circle cx="140" cy="78" r="3" />
        <circle cx="188" cy="88" r="3" />
      </g>
      {/* the counter */}
      <rect x="10" y="130" width="220" height="16" rx="3" fill="#6b4a2c" stroke="#3b2a1c" stroke-width="2" />
      <rect x="10" y="146" width="220" height="40" fill="#4a3322" />
      <path d="M40 146 V186 M120 146 V186 M200 146 V186" stroke="#2c1f14" stroke-width="2" />
      {/* coins and a scale */}
      <ellipse cx="60" cy="126" rx="16" ry="4" fill="#d1a64a" />
      <ellipse cx="60" cy="121" rx="16" ry="4" fill="#ffd27a" />
      <path d="M150 128 V100 M130 106 H170 M130 106 V116 H142 V106 M158 106 V116 H170 V106" stroke="#7e8b92" stroke-width="3" fill="none" stroke-linecap="round" />
    </Scene>
  );
}

export function EventArt({ eventId }: { eventId: string }) {
  // a lantern in a doorway: every story starts somewhere dim and warm
  return (
    <div class="eventart" data-testid="event-art" data-event={eventId}>
      <Scene label="A lantern glowing in a doorway">
        <rect width="240" height="200" fill="url(#nlamp)" />
        <path d="M70 160 V52 Q70 28 120 28 Q170 28 170 52 V160 Z" fill="#150d08" stroke="#6b4a2c" stroke-width="5" />
        <path d="M78 160 V56 Q78 38 120 38 Q162 38 162 56 V160 Z" fill="#2a1d13" />
        <path d="M96 160 L120 100 L144 160 Z" fill="#3b2a1c" opacity="0.8" />
        <g transform="translate(160 84)">
          <path d="M0 -14 V-4" stroke="#8a6a2a" stroke-width="3" />
          <rect x="-9" y="-4" width="18" height="26" rx="4" fill="#ffd27a" stroke="#8a6a2a" stroke-width="3" />
          <rect x="-5" y="2" width="10" height="14" rx="3" fill="#fff2cc" />
          <circle cx="0" cy="9" r="22" fill="#ffd27a" opacity="0.18" />
        </g>
        <circle cx="52" cy="40" r="2" fill="#fff2cc" opacity="0.7" />
        <circle cx="198" cy="30" r="1.5" fill="#fff2cc" opacity="0.7" />
      </Scene>
    </div>
  );
}

export function SpoilsArt() {
  return (
    <Scene label="An open crate of Cogs">
      <rect width="240" height="200" fill="url(#nlamp)" />
      <g transform="translate(50 92)">
        <path d="M0 20 H140 V70 H0 Z" fill="#6b4a2c" stroke="#3b2a1c" stroke-width="3" stroke-linejoin="round" />
        <path d="M0 20 L16 0 H124 L140 20" fill="#7d5a34" stroke="#3b2a1c" stroke-width="3" stroke-linejoin="round" />
        <path d="M46 20 V70 M94 20 V70" stroke="#3b2a1c" stroke-width="3" />
        <g fill="none" stroke-width="3.5" stroke-linecap="round">
          <circle cx="40" cy="6" r="12" stroke="#d1a64a" />
          <circle cx="72" cy="-2" r="9" stroke="#ffd27a" />
          <circle cx="102" cy="8" r="11" stroke="#c4703f" />
        </g>
      </g>
      <g class="sparks">
        <circle cx="70" cy="70" r="2" fill="#ffd27a" />
        <circle cx="168" cy="64" r="1.6" fill="#fff2cc" />
        <circle cx="120" cy="56" r="1.8" fill="#ffb84d" />
      </g>
    </Scene>
  );
}
