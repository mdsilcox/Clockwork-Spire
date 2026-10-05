// The tier mark on every item card (docs/art-direction.md "Tier marks"): color plus a shape, so it never relies on color
// alone. Common none, Uncommon one notch, Rare a diamond, Masterwork a cog, Legendary a star. B9b.0 CONTRACT: the component,
// its class names and its test id are fixed; the progression lane styles the shapes (src/ui/styles.css, `.tier-*`).
import type { Rarity } from '../core/types';

const LABEL: Record<Rarity, string> = { common: 'Common', uncommon: 'Uncommon', rare: 'Rare', masterwork: 'Masterwork', legendary: 'Legendary' };

/** Trinkets also have a 'boss' rarity: it shows no mark. */
export function TierMark({ rarity }: { rarity: Rarity | 'boss' }) {
  const r = rarity === 'boss' ? 'common' : rarity;
  return (
    <span class={`tier tier-${r}`} data-testid="tier-mark" data-rarity={r} role="img" aria-label={LABEL[r]} title={LABEL[r]} />
  );
}
