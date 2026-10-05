// Node screens inside a run: reward, event, shop, forge and oil, plus the part picker they share.
import type { ComponentChildren } from 'preact';
import { useState } from 'preact/hooks';
import { shopBuy, chooseEvent, forge, leave, oil, pickEventPart, rewardPart, rewardTrinket, runView, salvageDone, shopRemove } from '../app/controller';
import { EVENTS } from '../core/content/events';
import { partDef, partName, partText } from '../core/content/parts';
import { trinketDef } from '../core/content/trinkets';
import { salvagePayout } from '../core/salvage';
import type { PartInstance, RunState } from '../core/types';
import { FAMILY_COLOR, FAMILY_LABEL } from '../render/palette';
import { PartCard } from './PartCard';
import { TierMark } from './TierMark';
import { familyHint } from './synergy';
import { RunBar } from './Map';
import { TrinketIcon } from './runicons';
import { EventArt, ForgeArt, OilArt, ShopArt, SpoilsArt } from './NodeArt';
import { SprocketEventArt } from './Sprocket';
import { useTip } from './useTip';

/** Every node screen sits in a framed room: a drawn vignette beside the content. */
function Shell({ run, title, art, children }: { run: RunState; title: string; art: ComponentChildren; children: ComponentChildren }) {
  return (
    <main class="nodescreen" data-testid={`screen-${run.phase}`}>
      <RunBar run={run} title={title} />
      <div class="nodebody">
        <div class="nodeframe">
          <aside class="nodeart" aria-hidden="false">
            {art}
          </aside>
          <div class="nodecontent">{children}</div>
        </div>
      </div>
    </main>
  );
}

function TrinketCard({ id, onClick, disabled, extra, testid = 'trinket-card' }: { id: string; onClick?: () => void; disabled?: boolean; extra?: ComponentChildren; testid?: string }) {
  let d;
  try {
    d = trinketDef(id);
  } catch {
    return null;
  }
  const body = (
    <>
      <TrinketIcon name={d.name} size={34} />
      <span class="cname">{d.name}</span>
      <TierMark rarity={d.rarity} />
      <span class="cfam">{d.rarity === 'boss' ? 'Boss trinket' : `${d.rarity[0].toUpperCase()}${d.rarity.slice(1)} trinket`}</span>
      <span class="ctext">{d.text}</span>
      {extra && <span class="cextra">{extra}</span>}
    </>
  );
  return onClick ? (
    <button class="card tcard" data-testid={testid} data-id={id} disabled={disabled} onClick={onClick}>
      {body}
    </button>
  ) : (
    <div class="card tcard static" data-testid={testid} data-id={id}>
      {body}
    </div>
  );
}

// ---------- the part picker ----------

type Group = { uid: number; defId: string; plus: boolean; n: number };

function groupBin(bin: PartInstance[], onlyBase: boolean): Group[] {
  const m = new Map<string, Group>();
  for (const p of bin) {
    if (onlyBase && p.plus) continue;
    const k = `${p.defId}${p.plus ? '+' : ''}`;
    const g = m.get(k);
    if (g) g.n += 1;
    else m.set(k, { uid: p.uid, defId: p.defId, plus: p.plus, n: 1 });
  }
  return [...m.values()].sort((a, b) => partName(a.defId, a.plus).localeCompare(partName(b.defId, b.plus)));
}

export function PartPicker({ title, hint, bin, upgrade, onPick, onCancel }: { title: string; hint?: string; bin: PartInstance[]; upgrade?: boolean; onPick: (uid: number) => void; onCancel?: () => void }) {
  const groups = groupBin(bin, !!upgrade);
  return (
    <div class="glossary picker-overlay" role="dialog" aria-label={title} data-testid="part-picker">
      <header class="ghead">
        <h2>{title}</h2>
        <span class="grow" />
        {onCancel && (
          <button class="ghostbtn gclose" data-testid="picker-cancel" onClick={onCancel}>
            Back
          </button>
        )}
      </header>
      {hint && <p class="phint pickhint">{hint}</p>}
      <div class="glist cardlist">
        {groups.length === 0 && <p class="empty">No part fits here.</p>}
        {groups.map((g) =>
          upgrade ? (
            <button key={g.uid} class="card compare" data-testid="pick-part" data-def={g.defId} onClick={() => onPick(g.uid)}>
              <span class="band" style={{ background: FAMILY_COLOR[partDef(g.defId).family] }} />
              <span class="cname">
                {partName(g.defId, false)}
                {g.n > 1 ? ` x${g.n}` : ''}
              </span>
              <TierMark rarity={partDef(g.defId).rarity} />
              <span class="cfam" style={{ color: FAMILY_COLOR[partDef(g.defId).family] }}>
                {FAMILY_LABEL[partDef(g.defId).family]}
              </span>
              <span class="cmp">
                <span>
                  <i>Now</i>
                  {partText(g.defId, false)}
                </span>
                <span class="up">
                  <i>Upgraded</i>
                  {partText(g.defId, true)}
                </span>
              </span>
            </button>
          ) : (
            <PartCard key={g.uid} defId={g.defId} plus={g.plus} testid="pick-part" extra={g.n > 1 ? `x${g.n}` : undefined} onClick={() => onPick(g.uid)} />
          ),
        )}
      </div>
    </div>
  );
}

// ---------- reward ----------

export function RewardScreen() {
  const run = runView.value;
  const tip = useTip();
  if (!run || run.pending?.kind !== 'reward') return null;
  const p = run.pending;
  const needTrinket = p.trinkets.length > 0 && !p.trinketTaken;
  // a part "fits" when its family already has two or more parts in the bin
  const famCount = new Map<string, number>();
  for (const b of run.bin) {
    try {
      const f = partDef(b.defId).family;
      famCount.set(f, (famCount.get(f) ?? 0) + 1);
    } catch {
      /* unknown part: ignore */
    }
  }
  const fits = (id: string): boolean => {
    try {
      return (famCount.get(partDef(id).family) ?? 0) >= 2;
    } catch {
      return false;
    }
  };
  const ready = p.partTaken && !needTrinket;
  return (
    <Shell run={run} title="Spoils" art={<SpoilsArt />}>
      <section class="rewardbox">
        <p class="bigline" data-testid="reward-cogs">
          +{p.cogs} {run?.section ? 'Scrap' : 'Cogs'}
        </p>
        {p.blueprint && (
          <p class="banner-line" data-testid="blueprint-banner">
            Blueprint found: {partName(p.blueprint, false)}. It is now in the pool.
          </p>
        )}
        {p.parts.length > 0 && (
          <>
            <h3>{p.partTaken ? 'Part taken' : 'Take a part'}</h3>
            <div class="cardrow" data-testid="reward-parts">
              {p.parts.map((id, i) => (
                <PartCard
                  key={`${id}${i}`}
                  defId={id}
                  testid="reward-part"
                  fit={!p.partTaken && fits(id)}
                  disabled={p.partTaken}
                  tip={tip.on(() => ({ title: `${partName(id, false)}.`, text: partText(id, false), detail: `${familyHint(id)} Upgraded: ${partText(id, true)}` }))}
                  onClick={tip.guard(() => rewardPart(i))}
                />
              ))}
            </div>
            {!p.partTaken && (
              <button class="secondary" data-testid="reward-skip" onClick={() => rewardPart(null)}>
                Skip the part
              </button>
            )}
          </>
        )}
        {p.trinkets.length > 0 && (
          <>
            <h3>{p.trinketTaken ? 'Trinket taken' : 'Take a trinket'}</h3>
            <div class="cardrow" data-testid="reward-trinkets">
              {p.trinkets.map((id, i) => (
                <TrinketCard key={id} id={id} testid="reward-trinket" disabled={p.trinketTaken} onClick={() => rewardTrinket(i)} />
              ))}
            </div>
            {!p.trinketTaken && (
              <button class="secondary" data-testid="reward-trinket-skip" onClick={() => rewardTrinket(null)}>
                Skip the trinket
              </button>
            )}
          </>
        )}
        <div class="nodeactions">
          <button class="primary" data-testid="continue-node" disabled={!ready} onClick={() => leave()}>
            Continue
          </button>
        </div>
      </section>
      {tip.node}
    </Shell>
  );
}

// ---------- salvage (B7: replaces the part reward after fights) ----------

const RARITY_LABEL: Record<string, string> = { common: 'Common', uncommon: 'Uncommon', rare: 'Rare', masterwork: 'Masterwork', legendary: 'Legendary' };

/** A part name and text that never throw: a saved tray may name a part this build no longer has. */
function knownPart(id: string): { name: string; text: string } | null {
  try {
    return { name: partName(id, false), text: partText(id, false) };
  } catch {
    return null;
  }
}

export function SalvageScreen() {
  const run = runView.value;
  const [keep, setKeep] = useState<number[]>([]);
  if (!run || run.pending?.kind !== 'salvage') return null;
  const unit = run?.section ? 'Scrap' : 'Cogs';
  const p = run.pending;
  const needTrinket = p.trinkets.length > 0 && !p.trinketTaken;
  const toggle = (n: number): void => setKeep(keep.includes(n) ? keep.filter((k) => k !== n) : [...keep, n]);
  const scrapped = p.items.filter((it, n) => it.locked || !keep.includes(n));
  const pay = salvagePayout(p.items, keep, p.wrecked ?? 0).scrap;
  const finish = (): void => {
    if (!salvageDone(keep)) return;
    if (runView.value?.phase === 'reward') leave();
  };
  return (
    <Shell run={run} title="Salvage" art={<SpoilsArt />}>
      <section class="rewardbox salvagebox" data-testid="salvage-tray" aria-label="Salvage tray">
        <p class="bigline" data-testid="salvage-cogs">
          +{p.cogs} {unit} from the fight
        </p>
        {p.blueprint && (
          <p class="banner-line" data-testid="blueprint-banner">
            Blueprint found: {partName(p.blueprint, false)}. It is now in the pool.
          </p>
        )}
        {p.items.length > 0 ? (
          <>
            <p class="salvage-note">Keep any of these parts for your bin. What you leave is scrapped for {unit}.</p>
            <div class="salvage-list">
              {p.items.map((it, n) => {
                const key = it.salvage === 'spire-key';
                const known = key ? null : knownPart(it.salvage);
                const unknown = !key && !known;
                const name = key ? 'Spire Key' : (known?.name ?? 'Unknown part');
                const kept = keep.includes(n);
                return (
                  <div key={`${it.enemy}.${it.partId}`} class={`salvage-item ${kept ? 'kept' : ''} ${it.locked ? 'locked' : ''}`} data-testid={`salvage-item-${n}`}>
                    <span class="sname">{name}</span>
                    <span class="srarity">
                      <TierMark rarity={it.rarity} />
                      {RARITY_LABEL[it.rarity] ?? it.rarity}
                    </span>
                    {known && !it.locked && <span class="ctext">{known.text}</span>}
                    {unknown ? (
                      <span class="snote" data-testid={`salvage-unknown-${n}`}>
                        This part is not in this version of the game. It is scrapped.
                      </span>
                    ) : it.locked ? (
                      <span class="snote" data-testid={`salvage-locked-${n}`}>
                        Locked: you could almost see how it worked. It is scrapped for 6 {unit}.
                      </span>
                    ) : (
                      <button class={kept ? 'primary skeep' : 'secondary skeep'} data-testid={`salvage-keep-${n}`} aria-pressed={kept} onClick={() => toggle(n)}>
                        {kept ? 'Keeping it' : 'Keep it'}
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </>
        ) : (
          <p class="salvage-note" data-testid="salvage-empty">
            Nothing to salvage: no part of the machine broke. Take down the parts, not only the core, to bring some home.
          </p>
        )}
        {(scrapped.length > 0 || (p.wrecked ?? 0) > 0) && (
          <p class="salvage-note" data-testid="salvage-scrap">
            {scrapped.length > 0 && `${scrapped.length} ${scrapped.length === 1 ? 'part' : 'parts'} scrapped.`}
            {(p.wrecked ?? 0) > 0 && ` ${p.wrecked} wrecked.`}
          </p>
        )}
        {p.trinkets.length > 0 && (
          <>
            <h3>{p.trinketTaken ? 'Trinket taken' : 'Take a trinket'}</h3>
            <div class="cardrow" data-testid="reward-trinkets">
              {p.trinkets.map((id, i) => (
                <TrinketCard key={id} id={id} testid="reward-trinket" disabled={p.trinketTaken} onClick={() => rewardTrinket(i)} />
              ))}
            </div>
            {!p.trinketTaken && (
              <button class="secondary" data-testid="reward-trinket-skip" onClick={() => rewardTrinket(null)}>
                Skip the trinket
              </button>
            )}
          </>
        )}
        <div class="nodeactions salvage-foot">
          <span class="salvage-pay" data-testid="salvage-pay">
            {needTrinket ? 'Take or skip a trinket first.' : pay > 0 ? `Scrapping the rest adds +${pay} ${unit}` : 'Nothing left to scrap'}
          </span>
          <button class="primary" data-testid="salvage-done" disabled={needTrinket} onClick={finish}>
            Done
          </button>
        </div>
      </section>
    </Shell>
  );
}

// ---------- event ----------

const PICK_TITLE: Record<string, string> = {
  remove: 'Remove which part?',
  upgrade: 'Upgrade which part?',
  duplicate: 'Copy which part?',
  transform: 'Change which part?',
  sell: 'Sell which part?',
};

/** Why a greyed event choice is greyed, read from its own text. */
function whyNot(detail: string): string {
  const m = /(?:Pay|Lose) (\d+) Scrap/.exec(detail);
  return m ? `You need ${m[1]} Scrap.` : 'You have no part to give.';
}

export function EventScreen() {
  const run = runView.value;
  if (!run || run.pending?.kind !== 'event') return null;
  const p = run.pending;
  const def = EVENTS[p.eventId];
  if (!def) {
    return (
      <Shell run={run} title="A quiet corner" art={<EventArt eventId="quiet" />}>
        <section class="eventbox">
          <p>Nothing stirs here.</p>
          <button class="primary" data-testid="continue-node" onClick={() => leave()}>
            Continue
          </button>
        </section>
      </Shell>
    );
  }
  return (
    <Shell run={run} title={def.title} art={def.sprocket ? <SprocketEventArt eventId={def.id} /> : <EventArt eventId={def.id} />}>
      <section class="eventbox" data-testid="event" data-event={def.id}>
        {def.sprocket && <span class="sptag" data-testid="sprocket-tag">Sprocket</span>}
        <h2 class="evtitle">{def.title}</h2>
        {def.lines.map((l, i) => (
          <p key={i} class="evline">
            {l}
          </p>
        ))}
        {p.result ? (
          <>
            <p class="evresult" data-testid="event-result">
              {p.result}
            </p>
            <div class="nodeactions">
              <button class="primary" data-testid="continue-node" onClick={() => leave()}>
                Continue
              </button>
            </div>
          </>
        ) : (
          <div class="choices">
            {def.choices.map((c, i) => {
              const ok = c.available ? c.available(run) : true;
              return (
                <button key={i} class="choice" data-testid="event-choice" disabled={!ok} onClick={() => chooseEvent(i)}>
                  <b>{c.label}</b>
                  <span>{c.detail}</span>
                  {!ok && <span class="whynot">{whyNot(c.detail)}</span>}
                </button>
              );
            })}
          </div>
        )}
      </section>
      {p.needsPart && !p.result && <PartPicker title={PICK_TITLE[p.needsPart] ?? 'Pick a part'} bin={run.bin} upgrade={p.needsPart === 'upgrade'} onPick={(uid) => pickEventPart(uid)} />}
    </Shell>
  );
}

// ---------- shop ----------

export function ShopScreen() {
  const run = runView.value;
  const [removing, setRemoving] = useState(false);
  const tip = useTip();
  if (!run || run.pending?.kind !== 'shop') return null;
  const p = run.pending;
  const price = (n: number): string => `${n} Cogs`;
  return (
    <Shell run={run} title="The shop" art={<ShopArt />}>
      <section class="shopbox">
        <p class="bigline" data-testid="shop-cogs">
          You have {run.cogs} Cogs
        </p>
        <div class="cardrow wrap" data-testid="shop-stock">
          {p.stock.map((it, i) => {
            const cant = it.sold || run.cogs < it.price;
            const tag = it.sold ? 'Sold' : price(it.price);
            if (it.kind === 'part' && it.id) {
              return (
                <PartCard
                  key={i}
                  defId={it.id}
                  testid="shop-item"
                  disabled={cant}
                  extra={<b class={it.sold ? 'sold' : run.cogs < it.price ? 'poor' : 'price'}>{tag}</b>}
                  tip={tip.on(() => ({ title: `${partName(it.id!, false)}.`, text: partText(it.id!, false), detail: `${familyHint(it.id!)} Upgraded: ${partText(it.id!, true)}` }))}
                  onClick={tip.guard(() => shopBuy(i))}
                />
              );
            }
            if (it.kind === 'trinket' && it.id) {
              return <TrinketCard key={i} id={it.id} testid="shop-item" disabled={cant} extra={<b class={it.sold ? 'sold' : run.cogs < it.price ? 'poor' : 'price'}>{tag}</b>} onClick={() => shopBuy(i)} />;
            }
            if (it.kind === 'removal') {
              return (
                <button key={i} class="card service" data-testid="shop-removal" disabled={cant} onClick={() => setRemoving(true)}>
                  <span class="cname">Part removal</span>
                  <span class="ctext">Remove one part from your bin for good. A thinner bin draws its best parts more often.</span>
                  <span class="cextra">
                    <b class={it.sold ? 'sold' : run.cogs < it.price ? 'poor' : 'price'}>{tag}</b>
                  </span>
                </button>
              );
            }
            return (
              <button key={i} class="card service" data-testid="shop-oil" disabled={cant} onClick={() => shopBuy(i)}>
                <span class="cname">Oil</span>
                <span class="ctext">Heal 15 HP.</span>
                <span class="cextra">
                  <b class={it.sold ? 'sold' : run.cogs < it.price ? 'poor' : 'price'}>{tag}</b>
                </span>
              </button>
            );
          })}
        </div>
        <div class="nodeactions">
          <button class="primary" data-testid="leave-shop" onClick={() => leave()}>
            Leave the shop
          </button>
        </div>
      </section>
      {removing && (
        <PartPicker
          title="Remove which part?"
          hint="It is gone for good."
          bin={run.bin}
          onCancel={() => setRemoving(false)}
          onPick={(uid) => {
            setRemoving(false);
            shopRemove(uid);
          }}
        />
      )}
      {tip.node}
    </Shell>
  );
}

// ---------- forge ----------

export function ForgeScreen() {
  const run = runView.value;
  const [mode, setMode] = useState<'upgrade' | 'remove' | null>(null);
  if (!run || run.pending?.kind !== 'forge') return null;
  const p = run.pending;
  return (
    <Shell run={run} title="The forge" art={<ForgeArt />}>
      <section class="forgebox">
        {!p.done ? (
          <>
            <p class="evline">The fire is low but warm. Choose one: upgrade a part, or remove one.</p>
            <div class="choices two">
              <button class="choice" data-testid="forge-upgrade" onClick={() => setMode('upgrade')}>
                <b>Upgrade a part</b>
                <span>Better numbers, or a lower threshold. Shown with a +.</span>
              </button>
              <button class="choice" data-testid="forge-remove" onClick={() => setMode('remove')}>
                <b>Remove a part</b>
                <span>Take one part out of your bin for good.</span>
              </button>
            </div>
            <div class="nodeactions">
              <button class="secondary" data-testid="continue-node" onClick={() => leave()}>
                Leave without using it
              </button>
            </div>
          </>
        ) : (
          <>
            <p class="evresult" data-testid="forge-done">
              The forge is cooling. Your bin is changed.
            </p>
            <div class="nodeactions">
              <button class="primary" data-testid="continue-node" onClick={() => leave()}>
                Continue
              </button>
            </div>
          </>
        )}
      </section>
      {mode && !p.done && (
        <PartPicker
          title={mode === 'upgrade' ? 'Upgrade which part?' : 'Remove which part?'}
          hint={mode === 'upgrade' ? 'Each card shows the part now and upgraded.' : 'It is gone for good.'}
          bin={run.bin}
          upgrade={mode === 'upgrade'}
          onCancel={() => setMode(null)}
          onPick={(uid) => {
            const m = mode;
            setMode(null);
            forge(m, uid);
          }}
        />
      )}
    </Shell>
  );
}

// ---------- oil ----------

export function OilScreen() {
  const run = runView.value;
  if (!run || run.pending?.kind !== 'oil') return null;
  const p = run.pending;
  const heal = Math.max(0, Math.min(run.maxHp - run.hp, Math.floor(run.maxHp * 0.3)));
  return (
    <Shell run={run} title="The oil station" art={<OilArt />}>
      <section class="forgebox">
        {!p.done ? (
          <>
            <p class="evline">A quiet bench, a drip of oil. Choose one.</p>
            <div class="choices two">
              <button class="choice" data-testid="oil-repair" disabled={heal <= 0} onClick={() => oil('repair')}>
                <b>Repair</b>
                <span data-testid="oil-repair-text">
                  {heal <= 0 ? 'Already at full HP.' : `Heal ${Math.floor(run.maxHp * 0.3)} HP (30% of your max). You are at ${run.hp} of ${run.maxHp}.`}
                </span>
              </button>
              <button class="choice" data-testid="oil-polish" onClick={() => oil('polish')}>
                <b>Polish</b>
                <span>
                  +4 max HP, from {run.maxHp} to {run.maxHp + 4}.
                </span>
              </button>
            </div>
          </>
        ) : (
          <>
            <p class="evresult" data-testid="oil-done">
              Smooth and quiet. You feel ready.
            </p>
            <div class="nodeactions">
              <button class="primary" data-testid="continue-node" onClick={() => leave()}>
                Continue
              </button>
            </div>
          </>
        )}
      </section>
    </Shell>
  );
}
