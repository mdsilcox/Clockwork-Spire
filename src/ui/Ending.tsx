// The victory ending and credits. B4 CONTRACT: props fixed; the sprocket lane replaces this placeholder.
export interface EndingStats {
  runs: number;
  turns: number;
  biggestTurn: number;
  chassis: string;
}

export function Ending({ stats, onDone }: { stats: EndingStats; onDone: () => void }) {
  return (
    <div class="ending-placeholder" data-testid="ending">
      <p>The Clockmaker stops.</p>
      <p>
        Runs {stats.runs}, biggest turn {stats.biggestTurn}.
      </p>
      <button type="button" onClick={onDone}>
        Continue
      </button>
    </div>
  );
}
