// Bellfoot's code-drawn street (B10a; D-033's fallback until the painted scene passes review): dusk sky, the Spire far
// behind, cobbles, a front for every place at its anchor (src/ui/town.ts), lamp posts. Coordinates are scene units
// (SCENE_W x SCENE_H); the street shows the bottom VIEW_H of the scene, scaled to the frame.
import type { TownPlace } from './town';
import { GROUND_Y, SCENE_H, SCENE_W } from './town';

/** The slice of the scene's height the street shows (the sky above is cropped on a short frame). */
export const VIEW_H = 560;
export const VIEW_TOP = SCENE_H - VIEW_H;

/** Lamp posts along the street (x in scene units). */
export const LAMPS = [60, 360, 680, 1000, 1320, 1620, 1960, 2330];
/** Chimneys that smoke (scene units): the Workshop's and the archivist's. */
export const CHIMNEYS: [number, number][] = [
  [560, 360],
  [1520, 300],
];

const rr = (c: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number): void => {
  c.beginPath();
  c.roundRect(x, y, w, h, r);
};

function sky(c: CanvasRenderingContext2D): void {
  const g = c.createLinearGradient(0, VIEW_TOP, 0, GROUND_Y);
  g.addColorStop(0, '#171126');
  g.addColorStop(0.55, '#3a2638');
  g.addColorStop(1, '#8a5a44');
  c.fillStyle = g;
  c.fillRect(0, VIEW_TOP, SCENE_W, SCENE_H - VIEW_TOP);
  c.fillStyle = 'rgba(255,240,210,0.8)';
  for (let i = 0; i < 46; i++) {
    const x = (i * 211 + 37) % SCENE_W;
    const y = VIEW_TOP + ((i * 97) % 240);
    c.fillRect(x, y, i % 5 === 0 ? 3 : 2, i % 5 === 0 ? 3 : 2);
  }
  // a thin moon
  c.fillStyle = '#f1e3c6';
  c.beginPath();
  c.arc(260, VIEW_TOP + 110, 34, 0, Math.PI * 2);
  c.fill();
  c.fillStyle = '#2a1d33';
  c.beginPath();
  c.arc(276, VIEW_TOP + 102, 30, 0, Math.PI * 2);
  c.fill();
}

/** The Spire, very tall, behind the rooftops: a dark shaft with a clock face and a few lit windows. */
function spire(c: CanvasRenderingContext2D): void {
  const x = 1500;
  c.fillStyle = '#1b1422';
  c.beginPath();
  c.moveTo(x - 230, GROUND_Y - 120);
  c.lineTo(x - 120, VIEW_TOP - 10);
  c.lineTo(x + 120, VIEW_TOP - 10);
  c.lineTo(x + 230, GROUND_Y - 120);
  c.closePath();
  c.fill();
  c.strokeStyle = '#2d2138';
  c.lineWidth = 4;
  for (let i = 1; i < 6; i++) {
    const y = VIEW_TOP + i * 70;
    c.beginPath();
    c.moveTo(x - 130 - i * 14, y);
    c.lineTo(x + 130 + i * 14, y);
    c.stroke();
  }
  c.fillStyle = 'rgba(255,205,120,0.75)';
  for (let i = 0; i < 18; i++) c.fillRect(x - 100 + ((i * 53) % 200), VIEW_TOP + 20 + Math.floor(i / 3) * 62, 7, 11);
  // the clock face
  c.fillStyle = '#e8d9b0';
  c.beginPath();
  c.arc(x, VIEW_TOP + 100, 42, 0, Math.PI * 2);
  c.fill();
  c.strokeStyle = '#3a2a1c';
  c.lineWidth = 3;
  c.beginPath();
  c.moveTo(x, VIEW_TOP + 100);
  c.lineTo(x, VIEW_TOP + 72);
  c.moveTo(x, VIEW_TOP + 100);
  c.lineTo(x + 20, VIEW_TOP + 108);
  c.stroke();
}

function skyline(c: CanvasRenderingContext2D): void {
  c.fillStyle = '#251a2e';
  let x = -20;
  let i = 0;
  while (x < SCENE_W) {
    const w = 90 + ((i * 53) % 90);
    const h = 90 + ((i * 71) % 150);
    c.fillRect(x, GROUND_Y - h - 40, w, h + 40);
    if (i % 3 === 0) {
      c.beginPath();
      c.moveTo(x - 6, GROUND_Y - h - 40);
      c.lineTo(x + w / 2, GROUND_Y - h - 80);
      c.lineTo(x + w + 6, GROUND_Y - h - 40);
      c.fill();
    }
    x += w + 10;
    i++;
  }
}

function ground(c: CanvasRenderingContext2D): void {
  c.fillStyle = '#2c2018';
  c.fillRect(0, GROUND_Y, SCENE_W, SCENE_H - GROUND_Y);
  c.fillStyle = '#3a2b1e';
  c.fillRect(0, GROUND_Y, SCENE_W, 10);
  c.strokeStyle = 'rgba(0,0,0,0.25)';
  c.lineWidth = 2;
  for (let y = GROUND_Y + 24; y < SCENE_H; y += 28) {
    c.beginPath();
    c.moveTo(0, y);
    c.lineTo(SCENE_W, y);
    c.stroke();
    for (let x = (y / 28) % 2 ? 0 : 20; x < SCENE_W; x += 40) {
      c.beginPath();
      c.moveTo(x, y);
      c.lineTo(x, y + 28);
      c.stroke();
    }
  }
}

function windows(c: CanvasRenderingContext2D, x: number, y: number, cols: number, rows: number, w = 22, h = 30, gap = 18): void {
  for (let i = 0; i < cols; i++)
    for (let j = 0; j < rows; j++) {
      c.fillStyle = (i + j) % 3 === 0 ? '#ffd27a' : '#f0a85a';
      rr(c, x + i * (w + gap), y + j * (h + gap), w, h, 4);
      c.fill();
    }
}

function building(c: CanvasRenderingContext2D, x: number, w: number, h: number, wall: string, roof: string): number {
  c.fillStyle = wall;
  c.fillRect(x - w / 2, GROUND_Y - h, w, h);
  c.fillStyle = roof;
  c.beginPath();
  c.moveTo(x - w / 2 - 12, GROUND_Y - h);
  c.lineTo(x, GROUND_Y - h - 60);
  c.lineTo(x + w / 2 + 12, GROUND_Y - h);
  c.closePath();
  c.fill();
  return GROUND_Y - h;
}

function door(c: CanvasRenderingContext2D, x: number, w = 54, h = 100, color = '#1d130c'): void {
  c.fillStyle = color;
  rr(c, x - w / 2, GROUND_Y - h, w, h, 6);
  c.fill();
  c.fillStyle = '#d1a64a';
  c.beginPath();
  c.arc(x + w / 2 - 12, GROUND_Y - h / 2, 4, 0, Math.PI * 2);
  c.fill();
}

function gear(c: CanvasRenderingContext2D, x: number, y: number, r: number, color: string): void {
  c.fillStyle = color;
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    c.save();
    c.translate(x + Math.cos(a) * r, y + Math.sin(a) * r);
    c.rotate(a);
    c.fillRect(-4, -5, 9, 10);
    c.restore();
  }
  c.beginPath();
  c.arc(x, y, r, 0, Math.PI * 2);
  c.fill();
  c.fillStyle = 'rgba(0,0,0,0.5)';
  c.beginPath();
  c.arc(x, y, r * 0.35, 0, Math.PI * 2);
  c.fill();
}

function front(c: CanvasRenderingContext2D, p: TownPlace): void {
  const x = p.x;
  switch (p.id) {
    case 'gate': {
      // the Spire gate: an iron arch with a lantern
      c.fillStyle = '#2e2433';
      c.fillRect(x - 110, GROUND_Y - 260, 40, 260);
      c.fillRect(x + 70, GROUND_Y - 260, 40, 260);
      c.beginPath();
      c.moveTo(x - 110, GROUND_Y - 220);
      c.quadraticCurveTo(x, GROUND_Y - 360, x + 110, GROUND_Y - 220);
      c.lineTo(x + 110, GROUND_Y - 260);
      c.quadraticCurveTo(x, GROUND_Y - 400, x - 110, GROUND_Y - 260);
      c.fill();
      c.strokeStyle = '#8a6a2a';
      c.lineWidth = 5;
      for (let i = -50; i <= 50; i += 25) {
        c.beginPath();
        c.moveTo(x + i, GROUND_Y);
        c.lineTo(x + i, GROUND_Y - 200);
        c.stroke();
      }
      c.fillStyle = '#ffd27a';
      c.beginPath();
      c.arc(x, GROUND_Y - 330, 16, 0, Math.PI * 2);
      c.fill();
      break;
    }
    case 'workshop': {
      building(c, x, 250, 250, '#5a3a28', '#3a241a');
      windows(c, x - 90, GROUND_Y - 230, 3, 1);
      door(c, x, 60, 110);
      gear(c, x + 90, GROUND_Y - 190, 20, '#d1a64a');
      c.fillStyle = '#2a1c14';
      c.fillRect(x + 40, GROUND_Y - 360, 36, 120); // chimney
      break;
    }
    case 'sprocket': {
      // a doghouse with a red roof and a ball
      c.fillStyle = '#7a5530';
      c.fillRect(x - 70, GROUND_Y - 110, 140, 110);
      c.fillStyle = '#b23a2e';
      c.beginPath();
      c.moveTo(x - 86, GROUND_Y - 110);
      c.lineTo(x, GROUND_Y - 175);
      c.lineTo(x + 86, GROUND_Y - 110);
      c.closePath();
      c.fill();
      c.fillStyle = '#1d130c';
      c.beginPath();
      c.arc(x, GROUND_Y - 38, 30, Math.PI, 0);
      c.lineTo(x + 30, GROUND_Y);
      c.lineTo(x - 30, GROUND_Y);
      c.fill();
      c.fillStyle = '#d98a3d';
      c.beginPath();
      c.arc(x + 100, GROUND_Y - 10, 10, 0, Math.PI * 2);
      c.fill();
      break;
    }
    case 'trophies': {
      c.fillStyle = '#4a3322';
      c.fillRect(x - 100, GROUND_Y - 230, 200, 230);
      c.fillStyle = '#2a1c14';
      for (let i = 0; i < 3; i++) c.fillRect(x - 90, GROUND_Y - 200 + i * 70, 180, 8);
      c.fillStyle = '#e0b560';
      for (let i = 0; i < 3; i++)
        for (let j = 0; j < 3; j++) {
          rr(c, x - 76 + j * 56, GROUND_Y - 244 + i * 70 + 60, 28, 30, 6);
          c.fill();
        }
      break;
    }
    case 'archivist': {
      building(c, x, 230, 300, '#3b3a4c', '#262336');
      windows(c, x - 80, GROUND_Y - 270, 3, 2, 20, 28, 20);
      door(c, x, 56, 100, '#150f1c');
      c.fillStyle = '#262336';
      c.fillRect(x - 60, GROUND_Y - 420, 34, 130); // chimney
      c.fillStyle = '#e8d9b0';
      c.fillRect(x + 50, GROUND_Y - 130, 30, 10); // a book sign
      break;
    }
    case 'clocktower': {
      c.fillStyle = '#4a3b52';
      c.fillRect(x - 90, GROUND_Y - 460, 180, 460);
      c.fillStyle = '#2c2236';
      c.beginPath();
      c.moveTo(x - 104, GROUND_Y - 460);
      c.lineTo(x, GROUND_Y - 560);
      c.lineTo(x + 104, GROUND_Y - 460);
      c.fill();
      c.fillStyle = '#e8d9b0';
      c.beginPath();
      c.arc(x, GROUND_Y - 380, 50, 0, Math.PI * 2);
      c.fill();
      c.strokeStyle = '#3a2a1c';
      c.lineWidth = 4;
      c.beginPath();
      c.moveTo(x, GROUND_Y - 380);
      c.lineTo(x, GROUND_Y - 418);
      c.moveTo(x, GROUND_Y - 380);
      c.lineTo(x + 24, GROUND_Y - 370);
      c.stroke();
      door(c, x, 60, 110, '#1a1220');
      break;
    }
    default: {
      // a stall: an awning in stripes, a counter, a lantern
      c.fillStyle = '#4a3322';
      c.fillRect(x - 46, GROUND_Y - 70, 92, 70);
      c.fillRect(x - 44, GROUND_Y - 150, 6, 80);
      c.fillRect(x + 38, GROUND_Y - 150, 6, 80);
      for (let i = 0; i < 6; i++) {
        c.fillStyle = i % 2 ? '#e8d9b0' : '#b23a2e';
        c.beginPath();
        c.moveTo(x - 54 + i * 18, GROUND_Y - 150);
        c.lineTo(x - 36 + i * 18, GROUND_Y - 150);
        c.lineTo(x - 40 + i * 18, GROUND_Y - 124);
        c.lineTo(x - 58 + i * 18, GROUND_Y - 124);
        c.fill();
      }
      c.fillStyle = '#ffd27a';
      c.beginPath();
      c.arc(x, GROUND_Y - 100, 6, 0, Math.PI * 2);
      c.fill();
    }
  }
}

function lampPost(c: CanvasRenderingContext2D, x: number): void {
  c.fillStyle = '#1c1520';
  c.fillRect(x - 3, GROUND_Y - 170, 6, 170);
  c.fillRect(x - 12, GROUND_Y - 178, 24, 8);
  c.fillStyle = '#ffd27a';
  rr(c, x - 9, GROUND_Y - 206, 18, 28, 5);
  c.fill();
}

/** Paint the whole street once (the static layer). `c` is already scaled to scene units and translated by VIEW_TOP. */
export function drawStreet(c: CanvasRenderingContext2D, places: TownPlace[]): void {
  sky(c);
  spire(c);
  skyline(c);
  ground(c);
  for (const p of places) front(c, p);
  for (const x of LAMPS) lampPost(c, x);
}

/** The living layer, per frame, in scene units: lamp glow flicker and chimney steam. */
export function drawAmbience(c: CanvasRenderingContext2D, t: number, lamps: [number, number][] = LAMPS.map((x) => [x, GROUND_Y - 192]), chimneys: [number, number][] = CHIMNEYS): void {
  for (let i = 0; i < lamps.length; i++) {
    const f = 0.55 + 0.25 * Math.sin(t * (3 + i * 0.37) + i * 2) + 0.12 * Math.sin(t * 11 + i * 5);
    const [x, y] = lamps[i];
    const g = c.createRadialGradient(x, y, 2, x, y, 80);
    g.addColorStop(0, `rgba(255,210,122,${0.5 * f})`);
    g.addColorStop(1, 'rgba(255,210,122,0)');
    c.fillStyle = g;
    c.fillRect(x - 80, y - 80, 160, 160);
  }
  for (const [cx, cy] of chimneys) {
    for (let k = 0; k < 5; k++) {
      const u = ((t * 0.22 + k / 5) % 1);
      const x = cx + Math.sin(u * 5 + k) * 16 + u * 30;
      const y = cy - u * 130;
      c.fillStyle = `rgba(210,200,190,${0.28 * (1 - u)})`;
      c.beginPath();
      c.arc(x, y, 10 + u * 22, 0, Math.PI * 2);
      c.fill();
    }
  }
}
