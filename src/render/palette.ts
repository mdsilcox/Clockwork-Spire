// Shared colors: brass, copper and lamplight on a dark workshop. Used by the canvas and the DOM (as CSS vars too).
import type { Family } from '../core/types';

export const COLOR = {
  bg: '#17110c',
  panel: '#251b13',
  panelEdge: '#4a3624',
  tile: '#2e231a',
  tileEdge: '#5b4630',
  brass: '#d1a64a',
  brassDark: '#8a6a2a',
  copper: '#c4703f',
  copperDark: '#7d4524',
  steel: '#7e8b92',
  lamp: '#ffd27a',
  lampSoft: 'rgba(255, 210, 122, 0.35)',
  steam: 'rgba(230, 236, 240, 0.55)',
  plating: '#7fc8ff',
  hurt: '#ff7a55',
  good: '#9ad27a',
  ink: '#f1e3c6',
  inkSoft: '#b9a888',
  rust: '#a4502a',
} as const;

export const FAMILY_COLOR: Record<Family, string> = {
  gear: '#d1a64a',
  spring: '#c4703f',
  cam: '#6fb0a6',
  tempo: '#9a9ad4',
  steam: '#d08a8a',
  chime: '#c2a4dc',
};

/** Painted family accents (main and secondary) used by the stage art. The UI may read these too. */
export const FAMILY_ACCENT: Record<Family, { main: string; alt: string }> = {
  gear: { main: '#d1a64a', alt: '#8a6a2a' }, // brass
  spring: { main: '#c4703f', alt: '#7d4524' }, // copper
  cam: { main: '#c8985a', alt: '#7a5428' }, // bronze
  tempo: { main: '#cfd8dc', alt: '#5b666c' }, // silver
  steam: { main: '#8d979d', alt: '#ff8c3c' }, // iron and ember
  chime: { main: '#f3cf72', alt: '#6fb0a6' }, // gold and verdigris
};

export const FAMILY_LABEL: Record<Family, string> = {
  gear: 'Gear',
  spring: 'Spring',
  cam: 'Cam',
  tempo: 'Tempo',
  steam: 'Steam',
  chime: 'Chime',
};

export const FONT = '"Trebuchet MS", "Segoe UI", system-ui, sans-serif';
