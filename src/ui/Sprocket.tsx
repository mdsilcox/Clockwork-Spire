// Sprocket the corgi: a canvas he lives on, tappable to pet, with a pose for every mood.
import { useEffect, useRef } from 'preact/hooks';
import { SprocketView } from '../render/sprocket';
import type { SprocketPose } from '../render/sprocket';
import { playMood, playPet } from '../audio/sprocket';
import './sprocket.css';

export type { SprocketPose };

export interface SprocketProps {
  mood: SprocketPose;
  size?: number; // CSS px height, default 120
  onPet?: () => void;
  label?: string;
}

const DESCRIPTION: Record<SprocketPose, string> = {
  idle: 'Sprocket sits and wags his tail',
  happy: 'Sprocket wiggles happily',
  celebrate: 'Sprocket spins and celebrates',
  comfort: 'Sprocket trots over and leans against you',
  sleepy: 'Sprocket is curled up asleep',
  pet: 'Sprocket loves the pets',
  sniff: 'Sprocket sniffs around',
  run: 'Sprocket runs',
};

export function Sprocket({ mood, size = 120, onPet, label }: SprocketProps) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const view = useRef<SprocketView | null>(null);
  const moodRef = useRef(mood);
  const petTimer = useRef(0);
  moodRef.current = mood;
  const w = Math.round(size * 1.4);

  useEffect(() => {
    const el = canvas.current;
    if (!el) return;
    const v = new SprocketView(el, moodRef.current);
    v.resize(w, size);
    v.start();
    view.current = v;
    return () => {
      v.stop();
      view.current = null;
      window.clearTimeout(petTimer.current);
    };
  }, [w, size]);

  useEffect(() => {
    window.clearTimeout(petTimer.current);
    view.current?.setPose(mood);
    playMood(mood);
  }, [mood]);

  const pet = (): void => {
    view.current?.setPose('pet');
    playPet();
    onPet?.();
    window.clearTimeout(petTimer.current);
    petTimer.current = window.setTimeout(() => view.current?.setPose(moodRef.current), 1700);
  };

  return (
    <button
      type="button"
      class="sprocket"
      data-testid="sprocket"
      data-mood={mood}
      style={{ width: `${w}px`, height: `${size}px` }}
      aria-label={label ?? DESCRIPTION[mood]}
      onClick={pet}
    >
      <canvas ref={canvas} style={{ width: `${w}px`, height: `${size}px` }} aria-hidden="true" />
    </button>
  );
}

/** Small framed scene for the three Sprocket events (sprocket-blueprint, sprocket-pipe, sprocket-nap). */
export function SprocketEventArt({ eventId }: { eventId: string }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const el = canvas.current;
    if (!el) return;
    const v = new SprocketView(el, 'idle');
    v.resize(320, 170);
    v.setEvent(eventId);
    v.start();
    return () => v.stop();
  }, [eventId]);
  const alt: Record<string, string> = {
    'sprocket-blueprint': 'Sprocket sniffing at a rolled blueprint',
    'sprocket-pipe': 'Sprocket wedged behind the pipes, rear and tail sticking out',
    'sprocket-nap': 'Sprocket asleep on a warm boiler',
  };
  return (
    <div class="sprocket-event-art" data-testid="sprocket-event-art" data-event={eventId} role="img" aria-label={alt[eventId] ?? 'Sprocket'}>
      <canvas ref={canvas} aria-hidden="true" />
    </div>
  );
}
