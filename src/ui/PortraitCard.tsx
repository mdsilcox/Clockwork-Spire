// Shown instead of the game on a phone held upright: a drawn phone turning on its side.
export function PortraitCard() {
  return (
    <div class="portrait" role="alert" data-testid="portrait-card">
      <svg class="phonedraw" viewBox="0 0 120 120" aria-hidden="true" focusable="false">
        <g class="phonerot">
          <rect x="38" y="14" width="44" height="80" rx="9" fill="#2e231a" stroke="#d1a64a" stroke-width="4" />
          <rect x="44" y="26" width="32" height="54" rx="3" fill="#17110c" />
          <circle cx="60" cy="87" r="2.5" fill="#d1a64a" />
          <circle cx="52" cy="46" r="5" fill="none" stroke="#c4703f" stroke-width="2.5" />
          <circle cx="66" cy="58" r="4" fill="none" stroke="#d1a64a" stroke-width="2.5" />
        </g>
        <path d="M92 28 q14 8 4 26 M96 54 l-1 -9 M96 54 l9 -3" fill="none" stroke="#ffd27a" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round" />
      </svg>
      <h1>Turn your phone sideways</h1>
      <p>Clockwork Spire is built for a wide screen. Your climb is waiting exactly where you left it.</p>
    </div>
  );
}
