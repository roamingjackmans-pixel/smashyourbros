// Match rules: mode, stocks/time, items, ultimates, teams, modifiers (with presets) and the stage.
import { STAGES } from '../sim/data';
import type { MatchCfg, ModeId, PlayerCfg } from '../sim/types';
import { initState } from '../sim/sim';
import { Camera } from '../render/camera';
import { drawBackground, drawStage } from '../render/stages';
import { audio } from '../audio/audio';
import { h, liveCanvas, modal } from './dom';

export interface Rules {
  mode: ModeId;
  stocks: number;
  time: number;
  hp: number;
  items: number;
  ult: 'off' | 'meter' | 'orb';
  mods: string[];
  teams: boolean;
  ff: boolean;
  stage: string;
  flat: boolean;
  hazards: boolean;
}

export function defaultRules(): Rules {
  return { mode: 'stock', stocks: 3, time: 0, hp: 150, items: 2, ult: 'meter', mods: [], teams: false, ff: false, stage: 'random', flat: false, hazards: true };
}

export const MODES: { id: ModeId; name: string; blurb: string }[] = [
  { id: 'stock', name: 'Stock', blurb: 'Lose all your lives and you’re out.' },
  { id: 'time', name: 'Time', blurb: 'Most KOs when the clock runs out wins.' },
  { id: 'stamina', name: 'Stamina', blurb: 'Hit points instead of percent. Zero HP = KO.' },
  { id: 'coin', name: 'Coin Battle', blurb: 'Hits knock coins out of bros. Most coins wins.' },
  { id: 'koth', name: 'King of the Hill', blurb: 'Hold the glowing zone. 30 seconds wins.' },
];

export const MOD_GROUPS: { name: string; mods: { id: string; name: string; blurb: string }[] }[] = [
  {
    name: 'Physics twists',
    mods: [
      { id: 'lowgrav', name: 'Low Gravity', blurb: 'Floaty jumps, huge recoveries.' },
      { id: 'heavygrav', name: 'Heavy Gravity', blurb: 'Everyone drops like a protein brick.' },
      { id: 'ice', name: 'Ice Floors', blurb: 'Every stage is a skating rink.' },
      { id: 'wind', name: 'Gusty', blurb: 'Wind blows across the stage, switching sides.' },
      { id: 'bouncy', name: 'Bouncy Walls', blurb: 'The side blast zones bounce you back. Only top and bottom KO.' },
      { id: 'turbo', name: 'Turbo', blurb: 'Land a hit and you can cancel straight into anything.' },
    ],
  },
  {
    name: 'Body twists',
    mods: [
      { id: 'giant', name: 'Giants', blurb: 'Everyone is huge.' },
      { id: 'tiny', name: 'Tiny Bros', blurb: 'Everyone is pocket-sized and flies far.' },
      { id: 'glass', name: 'Glass Cannons', blurb: 'All damage ×1.5, knockback ×1.25.' },
      { id: 'invisible', name: 'Invisible', blurb: 'You only show up when you attack or get hit.' },
      { id: 'swap', name: 'Body Swap', blurb: 'Every 30 seconds, everyone swaps fighters.' },
      { id: 'mirror', name: 'Mirror Match', blurb: 'Everyone plays the same random fighter.' },
    ],
  },
  {
    name: 'Arena chaos',
    mods: [
      { id: 'lava', name: 'Rising Lava', blurb: 'Every 22 seconds the lava rises over the stage.' },
      { id: 'shrink', name: 'Shrinking Arena', blurb: 'The blast zones close in over the match.' },
      { id: 'meteors', name: 'Meteor Shower', blurb: 'Meteors rain down. Watch for the red markers.' },
      { id: 'topsy', name: 'Topsy-Turvy', blurb: 'The camera flips upside down every so often.' },
      { id: 'blackout', name: 'Blackout', blurb: 'The lights go out; only spotlights on the bros.' },
      { id: 'itemrain', name: 'Item Rain', blurb: 'Four times the items.' },
    ],
  },
  {
    name: 'Rule twists',
    mods: [
      { id: 'bounty', name: 'Bounty', blurb: 'The leader wears a target. KO them for a bonus.' },
      { id: 'potato', name: 'Hot Potato', blurb: 'A bomb sticks to someone. Hit a bro to pass it on before it blows.' },
      { id: 'suddenult', name: 'Sudden Ultimates', blurb: 'Ultimate meters fill three times faster.' },
      { id: 'audience', name: 'Live Studio Audience', blurb: 'Every 25 s the crowd votes in a random twist.' },
    ],
  },
];

export const PRESETS: { name: string; rules: Partial<Rules> }[] = [
  { name: 'Classic', rules: { mode: 'stock', stocks: 3, time: 0, items: 2, ult: 'meter', mods: [] } },
  { name: 'Competitive', rules: { mode: 'stock', stocks: 3, time: 7, items: 0, ult: 'off', mods: [], flat: false, hazards: false } },
  { name: 'Party Chaos', rules: { mode: 'stock', stocks: 3, items: 3, ult: 'orb', mods: ['audience', 'potato', 'itemrain', 'meteors'] } },
  { name: 'Low-G Brawl', rules: { mode: 'time', time: 3, items: 2, mods: ['lowgrav', 'bouncy'] } },
  { name: 'Lava Lunacy', rules: { mode: 'stock', stocks: 3, items: 1, mods: ['lava', 'heavygrav'] } },
  { name: 'Giant Glass', rules: { mode: 'stock', stocks: 2, items: 1, mods: ['giant', 'glass'] } },
  { name: 'Bro Swap', rules: { mode: 'stock', stocks: 4, items: 2, mods: ['swap', 'suddenult'] } },
];

export function rulesSummary(r: Rules): string {
  const m = MODES.find((x) => x.id === r.mode)?.name ?? r.mode;
  const len = r.mode === 'stock' || r.mode === 'stamina' ? `${r.stocks} stock${r.stocks > 1 ? 's' : ''}` : `${r.time || 3} min`;
  const it = ['no items', 'few items', 'items', 'lots of items'][r.items];
  const mods = r.mods.length ? ` · ${r.mods.length} modifier${r.mods.length > 1 ? 's' : ''}` : '';
  return `${m} · ${len} · ${it}${r.teams ? ' · teams' : ''}${mods}`;
}

export function buildCfg(r: Rules, players: PlayerCfg[], seed = Math.floor(Math.random() * 2 ** 31)): MatchCfg {
  const stage = r.stage === 'random' ? STAGES[seed % STAGES.length].id : r.stage;
  const timed = r.mode === 'time' || r.mode === 'coin' || r.mode === 'koth';
  return {
    seed,
    stage,
    flat: r.flat,
    hazards: r.hazards,
    mode: r.mode,
    stocks: r.stocks,
    time: timed ? (r.time || 3) * 60 : r.time * 60,
    hp: r.hp,
    items: r.items,
    ult: r.ult,
    mods: [...r.mods],
    teams: r.teams,
    friendlyFire: r.ff,
    players,
  };
}

/** the rules editor (a modal); calls onChange on every edit */
export function rulesModal(r: Rules, onChange: () => void, editable = true): void {
  const body = h('div.col');
  const close = modal(h('div.col', { style: { width: 'min(860px, 92vw)' } }, h('div.row', h('h2.grow', 'Rules'), h('button', { onclick: () => close() }, 'Done')), body), { wide: true, onClose: onChange });
  const render = (): void => {
    body.replaceChildren();
    const seg = <T extends string | number | boolean>(label: string, opts: [T, string][], get: () => T, set: (v: T) => void): HTMLElement =>
      h(
        'div.field',
        h('label', label),
        h(
          'div.seg',
          opts.map(([v, n]) =>
            h(`button${get() === v ? '.on' : ''}`, {
              disabled: !editable,
              onclick: () => {
                set(v);
                audio.sfx('menu');
                render();
                onChange();
              },
            }, n),
          ),
        ),
      );
    body.append(
      h('div.field', h('label', 'Presets'), h('div.seg', PRESETS.map((p) => h('button', { disabled: !editable, onclick: () => (Object.assign(r, p.rules), render(), onChange()) }, p.name)))),
      h(
        'div.rules',
        h(
          'div',
          seg('Mode', MODES.map((m) => [m.id, m.name] as [ModeId, string]), () => r.mode, (v) => (r.mode = v)),
          h('div.small.dim', { style: { marginTop: '-6px', marginBottom: '10px' } }, MODES.find((m) => m.id === r.mode)?.blurb ?? ''),
          r.mode === 'stock' || r.mode === 'stamina'
            ? seg('Stocks', [1, 2, 3, 4, 5, 7].map((n) => [n, String(n)] as [number, string]), () => r.stocks, (v) => (r.stocks = v))
            : seg('Minutes', [2, 3, 4, 5, 7].map((n) => [n, `${n}`] as [number, string]), () => r.time || 3, (v) => (r.time = v)),
          r.mode === 'stock' || r.mode === 'stamina' ? seg('Time limit', [0, 3, 5, 7].map((n) => [n, n ? `${n} min` : 'None'] as [number, string]), () => r.time, (v) => (r.time = v)) : '',
          r.mode === 'stamina' ? seg('Stamina HP', [100, 150, 200, 300].map((n) => [n, String(n)] as [number, string]), () => r.hp, (v) => (r.hp = v)) : '',
          seg('Items', [0, 1, 2, 3].map((n) => [n, ['Off', 'Few', 'Some', 'Lots'][n]] as [number, string]), () => r.items, (v) => (r.items = v)),
          seg('Ultimates', [['off', 'Off'], ['meter', 'Meter'], ['orb', 'Orb']] as ['off' | 'meter' | 'orb', string][], () => r.ult, (v) => (r.ult = v)),
          seg('Teams', [[false, 'Free-for-all'], [true, '2 v 2 Teams']] as [boolean, string][], () => r.teams, (v) => (r.teams = v)),
          r.teams ? seg('Friendly fire', [[false, 'Off'], [true, 'On']] as [boolean, string][], () => r.ff, (v) => (r.ff = v)) : '',
          seg('Stage hazards', [[true, 'On'], [false, 'Off']] as [boolean, string][], () => r.hazards, (v) => (r.hazards = v)),
        ),
        h(
          'div',
          MOD_GROUPS.map((g) =>
            h(
              'div.field',
              h('label', g.name),
              h(
                'div.mods',
                g.mods.map((m) =>
                  h(`div.mod${r.mods.includes(m.id) ? '.on' : ''}`, {
                    title: m.blurb,
                    onclick: () => {
                      if (!editable) return;
                      r.mods = r.mods.includes(m.id) ? r.mods.filter((x) => x !== m.id) : [...r.mods, m.id];
                      audio.sfx('menu');
                      render();
                      onChange();
                    },
                  }, m.name),
                ),
              ),
            ),
          ),
          h('div.small.dim', 'Hover a modifier to see what it does. They stack.'),
        ),
      ),
    );
  };
  render();
}

/** stage picker with live previews */
export function stagePicker(r: Rules, onChange: () => void, editable = true): HTMLElement {
  const wrap = h('div.col');
  const stops: (() => void)[] = [];
  const render = (): void => {
    for (const s of stops) s();
    stops.length = 0;
    wrap.replaceChildren();
    const grid = h('div.stages');
    const opts = [...STAGES.map((s) => s.id), 'random'];
    for (const id of opts) {
      const stg = STAGES.find((s) => s.id === id);
      const card = h(`div.stage-card${r.stage === id ? '.on' : ''}`);
      if (stg) {
        const preview = stagePreview(id, r.flat);
        stops.push(preview.stop);
        card.append(preview.el, h('div.nm', stg.name));
        card.title = stg.blurb;
      } else {
        card.append(h('div', { style: { aspectRatio: '16/10', display: 'grid', placeItems: 'center', fontFamily: 'Bungee', fontSize: '34px', background: 'linear-gradient(135deg,#ff3a6e,#3a8dff)' } }, '?'), h('div.nm', 'Random'));
      }
      card.addEventListener('click', () => {
        if (!editable) return;
        r.stage = id;
        audio.sfx('select');
        render();
        onChange();
      });
      grid.appendChild(card);
    }
    wrap.append(
      grid,
      h(
        'div.row',
        h('span.small.dim.grow', STAGES.find((s) => s.id === r.stage)?.blurb ?? 'A random stage each match.'),
        h('button.tiny' + (r.flat ? '.on' : ''), { disabled: !editable, onclick: () => ((r.flat = !r.flat), render(), onChange()) }, r.flat ? 'Flat form: ON' : 'Flat form: off'),
      ),
    );
  };
  render();
  (wrap as HTMLElement & { stop?: () => void }).stop = () => stops.forEach((s) => s());
  return wrap;
}

function stagePreview(id: string, flat: boolean): { el: HTMLCanvasElement; stop: () => void } {
  const st = initState({ seed: 1, stage: id, flat, mode: 'stock', stocks: 1, time: 0, hp: 100, items: 0, ult: 'off', mods: [], teams: false, friendlyFire: false, players: [] });
  const cam = new Camera();
  return liveCanvas('stagecv', (c, w, hh, t) => {
    st.frame = t;
    const stg = STAGES.find((s) => s.id === id)!;
    cam.x = (stg.solids[0].x1 + stg.solids[0].x2) / 2;
    cam.y = -200;
    cam.zoom = Math.min(w / 1900, hh / 1100);
    drawBackground(c, st, cam, w, hh, t, false);
    cam.apply(c, w, hh);
    drawStage(c, st, t, false);
  });
}
