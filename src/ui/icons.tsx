// Intent icons. Each kind has its own shape, so color is never the only signal.
import type { IntentKind } from '../core/types';

export const INTENT_NAME: Record<IntentKind, string> = {
  attack: 'Attack',
  defend: 'Defend',
  buff: 'Buff',
  debuff: 'Debuff',
  sabotage: 'Sabotage',
  charge: 'Charging',
  summon: 'Summon',
  special: 'Special',
};

export function IntentIcon({ kind, size = 22 }: { kind: IntentKind; size?: number }) {
  const common = { width: size, height: size, viewBox: '0 0 24 24', 'aria-hidden': true, focusable: 'false' } as const;
  const stroke = { fill: 'none', stroke: 'currentColor', 'stroke-width': 2, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' } as const;
  switch (kind) {
    case 'attack': // sword
      return (
        <svg {...common}>
          <path {...stroke} d="M20 4 L9 15 M9 11 L13 15 M9.5 14.5 L5 19 M4 20 L6 18" />
        </svg>
      );
    case 'defend': // shield
      return (
        <svg {...common}>
          <path {...stroke} d="M12 3 L20 6 V12 C20 17 16 20 12 22 C8 20 4 17 4 12 V6 Z" />
        </svg>
      );
    case 'sabotage': // wrench
      return (
        <svg {...common}>
          <path {...stroke} d="M14 4 A5 5 0 0 0 17 11 L8 20 L4 16 L13 7 A5 5 0 0 1 14 4 Z" />
        </svg>
      );
    case 'buff': // up arrow
      return (
        <svg {...common}>
          <path {...stroke} d="M12 20 V5 M6 11 L12 5 L18 11" />
        </svg>
      );
    case 'debuff': // down arrow
      return (
        <svg {...common}>
          <path {...stroke} d="M12 4 V19 M6 13 L12 19 L18 13" />
        </svg>
      );
    case 'charge': // clock
      return (
        <svg {...common}>
          <circle {...stroke} cx="12" cy="12" r="9" />
          <path {...stroke} d="M12 7 V12 L15 14" />
        </svg>
      );
    case 'summon': // plus
      return (
        <svg {...common}>
          <path {...stroke} d="M12 5 V19 M5 12 H19" />
        </svg>
      );
    default: // special: spiral
      return (
        <svg {...common}>
          <path {...stroke} d="M12 12 m0 -1 a1 1 0 1 1 -1 1 a3 3 0 1 1 3 3 a5 5 0 1 1 -5 -5 a7 7 0 1 1 7 7" />
        </svg>
      );
  }
}

/** Little shapes for statuses and gauges. Each is distinct in outline, so color is never the only cue. */
export function StatusIcon({ kind, size = 16 }: { kind: string; size?: number }) {
  const common = { width: size, height: size, viewBox: '0 0 24 24', 'aria-hidden': true, focusable: 'false' } as const;
  const stroke = { fill: 'none', stroke: 'currentColor', 'stroke-width': 2.4, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' } as const;
  switch (kind) {
    case 'scald': // flame
      return (
        <svg {...common}>
          <path {...stroke} d="M12 3 C14 7 18 9 18 14 A6 6 0 0 1 6 14 C6 11 8 10 9 8 C10 10 11 10 12 8 Z" />
        </svg>
      );
    case 'cracked': // crack
      return (
        <svg {...common}>
          <path {...stroke} d="M12 2 L9 9 L14 12 L8 22" />
        </svg>
      );
    case 'dazed': // stars in orbit
      return (
        <svg {...common}>
          <path {...stroke} d="M12 4 V8 M12 16 V20 M4 12 H8 M16 12 H20 M7 7 L9.5 9.5 M14.5 14.5 L17 17 M17 7 L14.5 9.5 M9.5 14.5 L7 17" />
        </svg>
      );
    case 'strength': // fist block with up chevron
      return (
        <svg {...common}>
          <path {...stroke} d="M6 20 H18 M12 17 V6 M7 11 L12 6 L17 11" />
        </svg>
      );
    case 'shell': // hexagon
      return (
        <svg {...common}>
          <path {...stroke} d="M12 3 L20 8 V16 L12 21 L4 16 V8 Z" />
        </svg>
      );
    case 'plating': // shield
      return (
        <svg {...common}>
          <path {...stroke} d="M12 3 L20 6 V12 C20 17 16 20 12 22 C8 20 4 17 4 12 V6 Z" />
        </svg>
      );
    case 'corroded': // drip
      return (
        <svg {...common}>
          <path {...stroke} d="M12 3 C16 9 18 12 18 15 A6 6 0 0 1 6 15 C6 12 8 9 12 3 Z" />
        </svg>
      );
    case 'grit': // diamond
      return (
        <svg {...common}>
          <path {...stroke} d="M12 3 L21 12 L12 21 L3 12 Z" />
        </svg>
      );
    case 'pressure': // gauge
      return (
        <svg {...common}>
          <path {...stroke} d="M4 17 A9 9 0 1 1 20 17 M12 14 L16 9" />
        </svg>
      );
    case 'jam': // wedge
      return (
        <svg {...common}>
          <path {...stroke} d="M3 19 L21 19 L21 8 Z" />
        </svg>
      );
    default:
      return (
        <svg {...common}>
          <circle {...stroke} cx="12" cy="12" r="7" />
        </svg>
      );
  }
}

export const STATUS_NAME: Record<string, string> = {
  scald: 'Scald',
  cracked: 'Cracked',
  dazed: 'Dazed',
  strength: 'Strength',
  shell: 'Shell',
  corroded: 'Corroded',
  grit: 'Grit',
  plating: 'Plating',
};
