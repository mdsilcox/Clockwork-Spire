// Map node icons, drawn in code. Each type has its own frame shape and glyph, so color is never the only cue.
import type { NodeType } from '../core/types';

export const NODE_NAME: Record<NodeType, string> = {
  fight: 'Fight',
  elite: 'Elite',
  event: 'Event',
  forge: 'Forge',
  oil: 'Oil station',
  shop: 'Shop',
  boss: 'Boss',
};

export const NODE_HINT: Record<NodeType, string> = {
  fight: 'A regular fight. Earns Cogs and a part.',
  elite: 'A harder fight. Drops a trinket.',
  event: 'A short story with choices.',
  forge: 'Upgrade a part, or remove one.',
  oil: 'Repair some HP, or polish for more max HP.',
  shop: 'Spend your Cogs.',
  boss: 'The guardian of the act.',
};

const S = { fill: 'none', stroke: 'currentColor', 'stroke-width': 2, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' } as const;

function teeth(cx: number, cy: number, r: number, n: number): string {
  let d = '';
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    const x1 = cx + Math.cos(a) * r;
    const y1 = cy + Math.sin(a) * r;
    const x2 = cx + Math.cos(a) * (r + 3);
    const y2 = cy + Math.sin(a) * (r + 3);
    d += `M${x1.toFixed(1)} ${y1.toFixed(1)} L${x2.toFixed(1)} ${y2.toFixed(1)} `;
  }
  return d;
}

function Frame({ type }: { type: NodeType }) {
  switch (type) {
    case 'elite': // hexagon
      return <path class="nframe" d="M20 2 L35 10.5 V29.5 L20 38 L5 29.5 V10.5 Z" />;
    case 'event': // rounded square
      return <rect class="nframe" x="4" y="4" width="32" height="32" rx="9" />;
    case 'forge': // diamond
      return <path class="nframe" d="M20 1 L39 20 L20 39 L1 20 Z" />;
    case 'shop': // octagon
      return <path class="nframe" d="M12 3 H28 L37 12 V28 L28 37 H12 L3 28 V12 Z" />;
    case 'boss': // double ring
      return (
        <>
          <circle class="nframe" cx="20" cy="20" r="19" />
          <circle cx="20" cy="20" r="16" fill="none" stroke="currentColor" stroke-width="1.5" opacity="0.7" />
        </>
      );
    default: // fight and oil: circle
      return <circle class="nframe" cx="20" cy="20" r="18" />;
  }
}

function Glyph({ type }: { type: NodeType }) {
  switch (type) {
    case 'fight': // two crossed gears
      return (
        <g {...S}>
          <circle cx="15" cy="22" r="5" />
          <circle cx="25" cy="18" r="5" />
          <path d={teeth(15, 22, 5, 6)} />
          <path d={teeth(25, 18, 5, 6)} />
        </g>
      );
    case 'elite': // a gear with horns
      return (
        <g {...S}>
          <circle cx="20" cy="23" r="5.5" />
          <path d={teeth(20, 23, 5.5, 8)} />
          <path d="M12 17 C9 14 9 10 12 8 M28 17 C31 14 31 10 28 8" />
        </g>
      );
    case 'event': // a question mark
      return (
        <g {...S}>
          <path d="M14.5 15 C14.5 9.5 25.5 9.5 25.5 15.5 C25.5 19.5 20 19.5 20 24" />
          <path d="M20 29.5 V30" stroke-width="3" />
        </g>
      );
    case 'forge': // an anvil
      return (
        <g {...S}>
          <path d="M9 14 H31 C31 18 27 20 24 20 V24 H27 V28 H13 V24 H16 V20 C13 20 11 18 9 14 Z" />
        </g>
      );
    case 'oil': // an oil can
      return (
        <g {...S}>
          <path d="M11 18 H24 V28 H11 Z M24 21 L31 15 M14 18 V14 H20 V18" />
          <path d="M31 15 L33 19" />
        </g>
      );
    case 'shop': // a coin
      return (
        <g {...S}>
          <circle cx="20" cy="20" r="8" />
          <path d="M23 16.5 C22 15 18 15 17.5 17.5 C17 20 23 19.5 22.5 22.5 C22 25 18 25 17 23.5 M20 13.5 V15 M20 25 V26.5" />
        </g>
      );
    default: // boss: a clock
      return (
        <g {...S}>
          <circle cx="20" cy="22" r="8" />
          <path d="M20 22 V17 M20 22 L24 24 M14 11 L16 15 M26 11 L24 15 M20 9 V13" />
        </g>
      );
  }
}

export function NodeIcon({ type, size = 44 }: { type: NodeType; size?: number }) {
  return (
    <svg class={`nicon t-${type}`} width={size} height={size} viewBox="0 0 40 40" aria-hidden="true" focusable="false">
      <Frame type={type} />
      <Glyph type={type} />
    </svg>
  );
}

/** A trinket has no art yet: a brass disc with its first letter. */
export function TrinketIcon({ name, size = 30 }: { name: string; size?: number }) {
  const ch = name.replace(/^[^A-Za-z]+/, '').slice(0, 1).toUpperCase();
  return (
    <span class="ticon" style={{ width: `${size}px`, height: `${size}px`, fontSize: `${Math.round(size * 0.5)}px` }} aria-hidden="true">
      {ch}
    </span>
  );
}
