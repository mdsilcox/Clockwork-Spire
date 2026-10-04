// Sprocket the corgi. B4 CONTRACT: props fixed; the sprocket lane replaces this placeholder.
export type SprocketPose = 'idle' | 'happy' | 'celebrate' | 'comfort' | 'sleepy' | 'pet' | 'sniff' | 'run';

export interface SprocketProps {
  mood: SprocketPose;
  size?: number; // CSS px height, default 120
  onPet?: () => void;
  label?: string;
}

export function Sprocket({ mood, size = 120, onPet, label }: SprocketProps) {
  return (
    <button
      type="button"
      class="sprocket-placeholder"
      data-testid="sprocket"
      data-mood={mood}
      style={{ width: `${size * 1.4}px`, height: `${size}px` }}
      aria-label={label ?? `Sprocket (${mood})`}
      onClick={() => onPet?.()}
    >
      Sprocket
    </button>
  );
}

/** Small framed scene for the three Sprocket events. */
export function SprocketEventArt({ eventId }: { eventId: string }) {
  return <div class="sprocket-event-art" data-testid="sprocket-event-art" data-event={eventId} />;
}
