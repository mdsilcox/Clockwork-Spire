// How to play: a drawn diagram of a turn and five short sections that link into the glossary.
import { useEffect, useRef } from 'preact/hooks';
import { howtoOpen, openGlossary } from '../app/prefs';
import { Linked } from './Tooltip';

const C = 54; // cell size in the diagram
const X0 = 24;
const Y0 = 30;
const cx = (col: number): number => X0 + col * C + C / 2;
const cy = (row: number): number => Y0 + row * C + C / 2;

function Arrow({ from, to, held }: { from: [number, number]; to: [number, number]; held?: boolean }) {
  const [x1, y1] = [cx(from[0]), cy(from[1])];
  const [x2, y2] = [cx(to[0]), cy(to[1])];
  const a = Math.atan2(y2 - y1, x2 - x1);
  const sx = x1 + Math.cos(a) * 20;
  const sy = y1 + Math.sin(a) * 20;
  const ex = x2 - Math.cos(a) * 20;
  const ey = y2 - Math.sin(a) * 20;
  return (
    <g class={`hw-arrow ${held ? 'held' : ''}`}>
      <line x1={sx} y1={sy} x2={ex} y2={ey} />
      {held ? (
        <path d={`M${ex + Math.cos(a + Math.PI / 2) * 7} ${ey + Math.sin(a + Math.PI / 2) * 7} L${ex - Math.cos(a + Math.PI / 2) * 7} ${ey - Math.sin(a + Math.PI / 2) * 7}`} />
      ) : (
        <path d={`M${ex - Math.cos(a - 0.5) * 9} ${ey - Math.sin(a - 0.5) * 9} L${ex} ${ey} L${ex - Math.cos(a + 0.5) * 9} ${ey - Math.sin(a + 0.5) * 9}`} />
      )}
    </g>
  );
}

function Badge({ col, row, text }: { col: number; row: number; text: string }) {
  return (
    <g>
      <rect x={cx(col) + 6} y={cy(row) - 25} width="26" height="16" rx="8" fill="#ffd27a" />
      <text x={cx(col) + 19} y={cy(row) - 13} text-anchor="middle" class="hw-badge">
        {text}
      </text>
    </g>
  );
}

export function TurnDiagram() {
  const cells: preact.JSX.Element[] = [];
  for (let r = 0; r < 3; r++) for (let c = 0; c < 5; c++) cells.push(<rect key={`${c}${r}`} x={X0 + c * C + 2} y={Y0 + r * C + 2} width={C - 4} height={C - 4} rx="5" class="hw-cell" />);
  return (
    <svg class="hwdiagram" viewBox="0 0 330 238" role="img" aria-label="A turn: the Mainspring sends motion into a Spur Gear, which passes it to two Escapements and a Coil Spring that holds it. Badges show how many times each part fires." data-testid="howto-diagram">
      {cells}
      {/* the Mainspring */}
      <circle cx={cx(0)} cy={cy(1)} r="19" class="hw-spring" />
      <path d={`M${cx(0)} ${cy(1)} m0 -3 a3 3 0 1 1 -3 3 a7 7 0 1 1 7 7 a11 11 0 1 1 -11 -11`} class="hw-swirl" />
      {/* parts */}
      <g>
        <circle cx={cx(1)} cy={cy(1)} r="14" class="hw-gear" />
        <path d={`M${cx(1)} ${cy(1) - 14} v-5 M${cx(1)} ${cy(1) + 14} v5 M${cx(1) - 14} ${cy(1)} h-5 M${cx(1) + 14} ${cy(1)} h5`} class="hw-tooth" />
        <circle cx={cx(1)} cy={cy(0)} r="12" class="hw-tempo" />
        <circle cx={cx(1)} cy={cy(2)} r="12" class="hw-tempo" />
        <path d={`M${cx(2) - 13} ${cy(1) - 7} q6.5 -7 13 0 t13 0 M${cx(2) - 13} ${cy(1) + 1} q6.5 -7 13 0 t13 0 M${cx(2) - 13} ${cy(1) + 9} q6.5 -7 13 0 t13 0`} class="hw-coil" />
      </g>
      <Badge col={1} row={1} text="x3" />
      <Badge col={1} row={0} text="x3" />
      <Badge col={1} row={2} text="x3" />
      {/* motion spreads: Mainspring to the Spur, then outward */}
      <Arrow from={[0, 1]} to={[1, 1]} />
      <Arrow from={[1, 1]} to={[1, 0]} />
      <Arrow from={[1, 1]} to={[1, 2]} />
      <Arrow from={[1, 1]} to={[2, 1]} />
      <Arrow from={[2, 1]} to={[3, 1]} held />
      {/* labels */}
      <g class="hw-label">
        <text x={cx(0)} y="20" text-anchor="middle">
          1 Mainspring
        </text>
        <text x={cx(1) + 10} y="20" text-anchor="start">
          2 Motion spreads
        </text>
        <text x={cx(3) + 20} y={Y0 + 3 * C + 16} text-anchor="middle">
          3 A spring holds
        </text>
        <text x={cx(3) + 40} y={cy(1) + 4} text-anchor="middle" class="muted">
          waits
        </text>
        <text x={cx(0) + 10} y={Y0 + 3 * C + 16} text-anchor="start">
          4 Badges: times fired
        </text>
      </g>
    </svg>
  );
}

const SECTIONS: { id: string; title: string; text: string }[] = [
  {
    id: 'machine',
    title: 'The machine',
    text: 'You build a machine from parts on a board of 5 by 3 cells. The Mainspring sends motion into the parts beside it, and motion spreads from part to part. Every part it powers does its effect: Strike hurts an enemy, Plate gives you Plating.',
  },
  {
    id: 'turn',
    title: 'A turn',
    text: 'You draw a hand, then place up to two parts and swap two parts once for free. The preview shows what Run will do, with a badge on every part that will fire. Press Run: the machine ticks three times, then the enemies act.',
  },
  {
    id: 'enemies',
    title: 'Enemies and intents',
    text: 'Every enemy shows its intent: what it will do next, as a shape and a number. Check it before you build. A wrench marks a sabotage, and the cell it will Rust glows. Plating soaks up an attack before your HP does.',
  },
  {
    id: 'run',
    title: 'The run',
    text: 'Climb the Spire floor by floor through fights, events, shops, forges and oil stations. Take a part after each fight, spend Cogs in shops, and beat the boss at the top of each act to climb on.',
  },
  {
    id: 'workshop',
    title: 'The Workshop',
    text: 'Win or lose, you come home to the Workshop. Brass buys permanent upgrades and new chassis, blueprints unlock parts, and Sprocket is very glad to see you.',
  },
];

export function HowToScreen() {
  const open = howtoOpen.value;
  const first = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (open) first.current?.focus();
  }, [open]);
  if (!open) return null;
  return (
    <div class="glossary howto" role="dialog" aria-label="How to play" aria-modal="true" data-testid="howto">
      <header class="ghead">
        <h2>How to play</h2>
        <span class="grow" />
        <button ref={first} class="ghostbtn gclose" data-testid="howto-close" onClick={() => (howtoOpen.value = false)}>
          Close
        </button>
      </header>
      <div class="howbody">
        <figure class="hwfig">
          <TurnDiagram />
          <figcaption>One turn: the Mainspring powers the Spur, the Spur passes motion on, the Coil Spring holds it.</figcaption>
        </figure>
        <div class="hwtext">
          {SECTIONS.map((s, i) => (
            <section key={s.id} data-testid={`howto-${s.id}`}>
              <h3>
                {i + 1}. {s.title}
              </h3>
              <p>
                <Linked text={s.text} />
              </p>
            </section>
          ))}
          <button class="secondary" data-testid="howto-glossary" onClick={() => openGlossary()}>
            Open the glossary
          </button>
        </div>
      </div>
    </div>
  );
}
