// After a match: the winner's pose and line, a stats table, task progress, and new-contestant challenges.
import { FIGHTERS } from '../sim/data';
import type { State } from '../sim/types';
import { checkTasks, TASKS, type Task } from '../data/tasks';
import { session, save } from '../game/session';
import { recordMatch, type MatchContext } from '../game/profile';
import { artFor } from '../render/fighters';
import { shade } from '../render/art';
import { audio } from '../audio/audio';
import { h, liveCanvas, uiRoot } from './dom';
import { announceAchievements } from './achievementsUi';
import { drawFighterAt } from './portrait';

export interface ResultsInfo {
  st: State;
  names: string[];
  palettes: number[];
  tints: string[];
  ctx: MatchContext;
  /** buttons along the bottom */
  actions: { label: string; cls?: string; fn: () => void }[];
  title?: string;
  /** don't record stats (practice, challenger fights record separately) */
  noRecord?: boolean;
}

const QUIPS = [
  'Good game, bros. Hug it out.',
  'A beautiful display of violent friendship.',
  'Nine billion viewers just said "awww".',
  'Somebody give that bro a protein shake.',
  'Post-match handshake: mandatory. Post-match hug: strongly encouraged.',
];

export function resultsScreen(info: ResultsInfo): { newTasks: Task[]; close: () => void } {
  const st = info.st;
  let newTasks: Task[] = [];
  if (!info.noRecord) {
    recordMatch(session.profile, st, info.ctx);
    newTasks = checkTasks(session.profile);
    announceAchievements(session.profile);
    save();
  }
  const root = uiRoot();
  const stops: (() => void)[] = [];
  const winners = st.winner;
  const w0 = winners[0] ?? -1;
  const failed = !!st.cfg.goal && winners.length === 0;
  const humans = st.fighters.filter((f) => !st.cfg.players[f.i]?.grunt && !st.cfg.players[f.i]?.boss);
  const wf = w0 >= 0 ? st.fighters[w0] : null;
  const wdef = wf ? FIGHTERS[wf.def].def : null;
  const title = info.title ?? (failed ? 'SO CLOSE, BRO' : wf ? `${info.names[w0] || wdef?.name} WINS!` : 'NO CONTEST');
  const line = wdef ? wdef.wins[(st.frame >> 3) % wdef.wins.length] : QUIPS[st.frame % QUIPS.length];
  // the winners on a podium
  const stage = liveCanvas('podium', (c, w, hh, t) => {
    const g = c.createLinearGradient(0, 0, 0, hh);
    const col = wf ? (info.tints[w0] ?? '#ff3a6e') : '#3a1450';
    g.addColorStop(0, shade(col, -0.2));
    g.addColorStop(1, shade(col, -0.75));
    c.fillStyle = g;
    c.fillRect(0, 0, w, hh);
    c.globalAlpha = 0.12;
    c.fillStyle = '#fff';
    for (let i = 0; i < 14; i++) {
      c.save();
      c.translate(w / 2, hh * 1.1);
      c.rotate(((i / 14) * Math.PI - Math.PI / 2) * 1.2 + Math.sin(t * 0.01) * 0.1);
      c.fillRect(-12, -hh * 1.4, 24, hh * 1.4);
      c.restore();
    }
    c.globalAlpha = 1;
    const shown = (winners.length ? winners : humans.map((f) => f.i)).slice(0, 4);
    shown.forEach((idx, k) => {
      const f = st.fighters[idx];
      const id = st.cfg.players[idx]?.fighter ?? FIGHTERS[f.def].def.id;
      const x = w * ((k + 1) / (shown.length + 1));
      c.fillStyle = 'rgba(0,0,0,0.3)';
      c.beginPath();
      c.ellipse(x, hh * 0.9, w * 0.11, hh * 0.04, 0, 0, Math.PI * 2);
      c.fill();
      drawFighterAt(c, FIGHTERS[f.def].def.id || id, info.palettes[idx] ?? 0, x, hh * 0.9, hh * (shown.length > 2 ? 0.55 : 0.72), t + k * 9, failed ? 'idle' : 'win', k % 2 ? -1 : 1);
    });
  });
  stops.push(stage.stop);
  // stats
  const rows: [string, (i: number) => number, boolean][] = [
    ['KOs', (i) => st.fighters[i].st.kos, true],
    ['Falls', (i) => st.fighters[i].st.falls, false],
    ['Damage dealt', (i) => Math.round(st.fighters[i].st.dealt), true],
    ['Damage taken', (i) => Math.round(st.fighters[i].st.taken), false],
    ['Hits landed', (i) => st.fighters[i].st.hits, true],
    ['Parries', (i) => st.fighters[i].st.parries, true],
    ['Techs', (i) => st.fighters[i].st.techs, true],
    ['Smash attacks', (i) => st.fighters[i].st.smashes, true],
    ['Items used', (i) => st.fighters[i].st.items, true],
    ['Self-destructs', (i) => st.fighters[i].st.sds, false],
  ];
  if (st.cfg.mode === 'coin') rows.unshift(['Coins', (i) => st.fighters[i].coins, true]);
  if (st.cfg.mode === 'time') rows.unshift(['Score', (i) => st.fighters[i].score, true]);
  const table = h('table.stats', h('tr', h('th', ''), humans.map((f) => h('th', { style: { color: info.tints[f.i] } }, (info.names[f.i] || FIGHTERS[f.def].def.name).slice(0, 12)))));
  for (const [label, fn, high] of rows) {
    const vals = humans.map((f) => fn(f.i));
    const best = high ? Math.max(...vals) : Math.min(...vals);
    table.appendChild(h('tr', h('td', { style: { textAlign: 'left' } }, label), vals.map((v) => h(`td${v === best && vals.some((x) => x !== v) ? '.best' : ''}`, String(v)))));
  }
  // tasks: the closest ones still to do
  const p = session.profile;
  const open = TASKS.filter((t) => !p.unlocked.includes(t.fighter) && !p.done.includes(t.id))
    .map((t) => ({ t, frac: Math.min(1, t.progress(p) / t.goal) }))
    .sort((a, b) => b.frac - a.frac)
    .slice(0, 3);
  const taskBox = h(
    'div.col',
    h('h3', { style: { fontSize: '16px', color: 'var(--gold)' } }, newTasks.length ? 'TASK COMPLETE!' : 'Closest unlocks'),
    newTasks.map((t) => h('div.card', h('b', `★ ${t.title}`), h('div.small', `A new contestant wants to fight you: ${FIGHTERS.find((f) => f.def.id === t.fighter)?.def.name}.`))),
    open.map(({ t, frac }) => h('div', h('div.small', h('b', t.title), ` — ${t.desc}`), h('div.progress', h('div', { style: { width: `${Math.round(frac * 100)}%` } })), h('div.tiny.dim', `${Math.min(t.goal, t.progress(p))} / ${t.goal}`))),
  );
  const el = h(
    'div.screen',
    h('div.topbar', h('h2', title)),
    h(
      'div.results',
      h('div.col', h('div.panel.winner-stage', { style: { padding: '0', overflow: 'hidden' } }, stage.el), h('div.quote.center', `“${line}”`)),
      h('div.col', h('div.panel', table), h('div.panel', taskBox)),
    ),
    h('div.row.wrap', { style: { marginTop: '16px', justifyContent: 'center' } }, info.actions.map((a, i) => h(`button.big${a.cls ? `.${a.cls}` : ''}`, { 'data-autofocus': i === 0, 'data-pad-start': i === 0, onclick: () => (close(), a.fn()) }, a.label))),
  );
  root.replaceChildren(el);
  audio.say(failed ? 'So close!' : `${(info.names[w0] || wdef?.name || '').replace(/^CPU.*/, wdef?.name ?? '')} wins!`, 1);
  const close = (): void => {
    for (const s of stops) s();
    el.remove();
  };
  void artFor;
  return { newTasks, close };
}

/** the "A NEW CONTESTANT APPEARS!" splash; resolves when dismissed */
export function challengerSplash(fighter: string): Promise<void> {
  return new Promise((resolve) => {
    const def = FIGHTERS.find((f) => f.def.id === fighter)?.def;
    const cv = liveCanvas('chcv', (c, w, hh, t) => {
      drawFighterAt(c, fighter, 0, w / 2, hh * 0.95, hh * 0.85, t, 'idle', -1, t < 60);
    });
    cv.el.style.width = '320px';
    cv.el.style.height = '320px';
    const el = h('div.challenger', h('div.col', { style: { alignItems: 'center' } }, h('h1', 'A NEW CONTESTANT APPEARS!'), cv.el, h('div.display', { style: { fontSize: '28px', color: 'var(--gold)' } }, def?.name ?? fighter), h('div.quote', `“${def?.line ?? ''}”`), h('button.big.primary', { 'data-pad-start': true, 'data-autofocus': true, onclick: () => done() }, 'Bring it, bro')));
    document.body.appendChild(el);
    audio.sfx('ultimate');
    audio.say('A new contestant appears!', 1);
    const done = (): void => {
      cv.stop();
      el.remove();
      resolve();
    };
  });
}
