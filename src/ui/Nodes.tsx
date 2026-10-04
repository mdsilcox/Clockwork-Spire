// Node screens inside a run: reward, event, shop, forge and oil, plus the part picker they share.
import type { ComponentChildren } from 'preact';
import { useState } from 'preact/hooks';
import { shopBuy, chooseEvent, forge, leave, oil, pickEventPart, rewardPart, rewardTrinket, runView, shopRemove } from '../app/controller';
import { EVENTS } from '../core/content/events';
import { partDef, partName, partText } from '../core/content/parts';
import { trinketDef } from '../core/content/trinkets';
import type { PartInstance, RunState } from '../core/types';
import { FAMILY_COLOR, FAMILY_LABEL } from '../render/palette';
import { PartCard } from './PartCard';
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
  const ready = p.partTaken && !needTrinket;
  return (
    <Shell run={run} title="Spoils" art={<SpoilsArt />}>
      <section class="rewardbox">
        <p class="bigline" data-testid="reward-cogs">
          +{p.cogs} Cogs
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
                  disabled={p.partTaken}
                  tip={tip.on(() => ({ title: `${partName(id, false)}.`, text: partText(id, false), detail: `${FAMILY_LABEL[partDef(id).family]} part. Upgraded: ${partText(id, true)}` }))}
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

// ---------- event ----------

const PICK_TITLE: Record<string, string> = {
  remove: 'Remove which part?',
  upgrade: 'Upgrade which part?',
  duplicate: 'Copy which part?',
  transform: 'Change which part?',
  sell: 'Sell which part?',
};

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
                  tip={tip.on(() => ({ title: `${partName(it.id!, false)}.`, text: partText(it.id!, false), detail: `Upgraded: ${partText(it.id!, true)}` }))}
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
