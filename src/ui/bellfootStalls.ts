// The stalls of Bellfoot (B10a gate), code-drawn over the painted street: lit, stocked and signed when someone lives there,
// shuttered and dark when nobody does. Scene units; drawn per frame so lanterns flicker and signs sway.
import { ALL_PLACES, GROUND_Y } from './town';

const SIGN_NAME: Record<string, string> = { 'oil-merchant': 'Oil', apprentice: 'Tools', lamplighter: 'Lamps', 'hour-ghost': 'Hours', 'traders-cousin': 'Wares' };

const rr = (c: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number): void => {
  c.beginPath();
  c.roundRect(x, y, w, h, r);
};

function wares(c: CanvasRenderingContext2D, id: string, x: number, y: number, t: number): void {
  switch (id) {
    case 'oil-merchant':
      for (let i = -1; i <= 1; i++) {
        c.fillStyle = '#c4703f';
        rr(c, x + i * 22 - 7, y - 24, 14, 24, 4);
        c.fill();
        c.fillStyle = '#f0c46a';
        c.fillRect(x + i * 22 - 3, y - 30, 6, 7);
      }
      break;
    case 'apprentice':
      c.strokeStyle = '#d1a64a';
      c.lineWidth = 4;
      c.lineCap = 'round';
      c.beginPath();
      c.moveTo(x - 26, y - 4);
      c.lineTo(x - 8, y - 26);
      c.moveTo(x + 4, y - 4);
      c.lineTo(x + 24, y - 24);
      c.stroke();
      c.fillStyle = '#8a6a2a';
      c.beginPath();
      c.arc(x + 30, y - 10, 9, 0, Math.PI * 2);
      c.fill();
      c.fillStyle = 'rgba(0,0,0,0.5)';
      c.beginPath();
      c.arc(x + 30, y - 10, 3.5, 0, Math.PI * 2);
      c.fill();
      break;
    case 'lamplighter': {
      c.fillStyle = '#3a2a1c';
      c.fillRect(x - 3, y - 36, 6, 36);
      const f = 0.8 + 0.2 * Math.sin(t * 7);
      c.fillStyle = `rgba(255,214,130,${f})`;
      rr(c, x - 10, y - 52, 20, 20, 5);
      c.fill();
      break;
    }
    case 'hour-ghost': {
      const g = c.createRadialGradient(x, y - 22, 2, x, y - 22, 36);
      g.addColorStop(0, `rgba(190,215,235,${0.5 + 0.15 * Math.sin(t * 1.6)})`);
      g.addColorStop(1, 'rgba(190,215,235,0)');
      c.fillStyle = g;
      c.fillRect(x - 40, y - 60, 80, 80);
      c.strokeStyle = 'rgba(232,217,176,0.8)';
      c.lineWidth = 2.5;
      c.beginPath();
      c.arc(x, y - 22, 14, 0, Math.PI * 2);
      c.moveTo(x, y - 22);
      c.lineTo(x, y - 32);
      c.moveTo(x, y - 22);
      c.lineTo(x + 8, y - 18);
      c.stroke();
      break;
    }
    default:
      // the cousin's cart: a wheel and bundles
      c.strokeStyle = '#8a6a2a';
      c.lineWidth = 4;
      c.beginPath();
      c.arc(x - 18, y - 14, 14, 0, Math.PI * 2);
      c.moveTo(x - 18, y - 28);
      c.lineTo(x - 18, y);
      c.moveTo(x - 32, y - 14);
      c.lineTo(x - 4, y - 14);
      c.stroke();
      c.fillStyle = '#b9a888';
      rr(c, x + 6, y - 22, 20, 22, 6);
      c.fill();
      c.fillStyle = '#7a5530';
      rr(c, x + 24, y - 16, 14, 16, 5);
      c.fill();
  }
}

/** `occupied` holds the stall place ids that have a resident. */
export function drawStalls(c: CanvasRenderingContext2D, t: number, occupied: Set<string>): void {
  for (const p of ALL_PLACES) {
    if (!p.id.startsWith('stall-')) continue;
    const rid = p.id.slice(6);
    const x = p.x;
    if (!occupied.has(p.id)) {
      // shuttered: wood slats over the counter, unlit
      c.fillStyle = 'rgba(40,26,18,0.92)';
      c.fillRect(x - 40, GROUND_Y - 100, 80, 96);
      c.strokeStyle = 'rgba(0,0,0,0.55)';
      c.lineWidth = 2;
      for (let y = GROUND_Y - 94; y < GROUND_Y - 6; y += 11) {
        c.beginPath();
        c.moveTo(x - 40, y);
        c.lineTo(x + 40, y);
        c.stroke();
      }
      c.fillStyle = '#6b4d2e';
      c.fillRect(x - 40, GROUND_Y - 104, 80, 6);
      continue;
    }
    wares(c, rid, x, GROUND_Y - 36, t);
    // a warm lantern with glow
    const lx = x + 40;
    const ly = GROUND_Y - 112;
    const f = 0.7 + 0.2 * Math.sin(t * 5 + p.x) + 0.1 * Math.sin(t * 13 + p.x * 3);
    const g = c.createRadialGradient(lx, ly, 2, lx, ly, 56);
    g.addColorStop(0, `rgba(255,205,120,${0.65 * f})`);
    g.addColorStop(1, 'rgba(255,205,120,0)');
    c.fillStyle = g;
    c.fillRect(lx - 56, ly - 56, 112, 112);
    c.fillStyle = '#ffd27a';
    rr(c, lx - 5, ly - 8, 10, 16, 3);
    c.fill();
    // the hanging sign, swaying a little
    c.save();
    c.translate(x, GROUND_Y - 150);
    c.rotate(Math.sin(t * 1.3 + p.x) * 0.06);
    c.strokeStyle = '#2a1c14';
    c.lineWidth = 2;
    c.beginPath();
    c.moveTo(-26, 0);
    c.lineTo(-22, 14);
    c.moveTo(26, 0);
    c.lineTo(22, 14);
    c.stroke();
    c.fillStyle = '#4a3322';
    rr(c, -34, 14, 68, 24, 4);
    c.fill();
    c.strokeStyle = '#d1a64a';
    c.stroke();
    c.fillStyle = '#f1e3c6';
    c.font = 'bold 17px serif';
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    c.fillText(SIGN_NAME[rid] ?? '', 0, 27);
    c.restore();
  }
}
