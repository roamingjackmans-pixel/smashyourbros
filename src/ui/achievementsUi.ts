// Statistics and achievements on screen (D24): the home screen's stats panel, unlock toasts, and the Trophies
// screen (achievements with progress bars, the twelve unlock tasks, every lifetime statistic).
import { mainMenu, show } from '../app';
import { session, save } from '../game/session';
import { favouriteFighter, favouriteMove, stat, type Profile } from '../game/profile';
import { moveName } from '../game/stats';
import { ACHIEVEMENTS, achievementCount, checkAchievements, type Achievement } from '../data/achievements';
import { TASKS } from '../data/tasks';
import { EPISODES } from '../data/story';
import { INTENSITY_NAMES } from '../data/classic';
import { FIGHTER_INDEX, FIGHTERS, STAGES } from '../sim/data';
import { drawPortraitCached } from '../render/hud';
import { audio } from '../audio/audio';
import { h, liveCanvas, toast } from './dom';
import { hintBar } from './glyphs';

// ------------------------------------------------------------------ numbers

export function fmtInt(n: number): string {
  return Math.round(n).toLocaleString('en-GB');
}

export function fmtTime(sec: number): string {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  return h ? `${h}h ${m}m` : `${m}m ${Math.floor(sec % 60)}s`;
}

const storyIds = (): string[] => EPISODES.flatMap((e) => e.nodes.map((n) => n.id));

/** the numbers the home panel and the statistics tab show */
export function summary(p: Profile): {
  matches: number;
  wins: number;
  winRate: number;
  kos: number;
  falls: number;
  sds: number;
  damage: number;
  time: number;
  fav: string | null;
  favName: string;
  move: string;
  combo: number;
  story: [number, number];
  classicBest: number;
  classicCleared: number;
  onlineWins: number;
  onlineMatches: number;
  ach: [number, number];
} {
  const matches = stat(p, 'matches');
  const wins = stat(p, 'wins');
  const fav = favouriteFighter(p);
  const mv = favouriteMove(p);
  const ids = storyIds();
  return {
    matches,
    wins,
    winRate: matches ? wins / matches : 0,
    kos: stat(p, 'kos'),
    falls: stat(p, 'falls'),
    sds: stat(p, 'sds'),
    damage: stat(p, 'damage'),
    time: stat(p, 'time'),
    fav,
    favName: fav && FIGHTER_INDEX[fav] !== undefined ? FIGHTERS[FIGHTER_INDEX[fav]].def.name : '—',
    move: mv ? moveName(mv) : '—',
    combo: stat(p, 'bestCombo'),
    story: [ids.filter((i) => p.story.cleared.includes(i)).length, ids.length],
    classicBest: Math.max(0, ...Object.values(p.classic)),
    classicCleared: Object.keys(p.classic).length,
    onlineWins: stat(p, 'w_online'),
    onlineMatches: stat(p, 'm_online'),
    ach: [achievementCount(p), ACHIEVEMENTS.length],
  };
}

// ------------------------------------------------------------------ unlocks

/** check for new achievements, toast them and save; returns them */
export function announceAchievements(p: Profile = session.profile): Achievement[] {
  const fresh = checkAchievements(p);
  fresh.forEach((a, i) =>
    setTimeout(() => {
      toast(`🏆 ACHIEVEMENT: ${a.icon} ${a.name} — ${a.desc}`, 'gold', 5200);
      audio.sfx(i === 0 ? 'ultimate' : 'select');
    }, 400 + i * 900),
  );
  if (fresh.length) save();
  return fresh;
}

/** on sign-in: achievements earned by play from before they existed are given quietly, with one toast */
export function catchUpAchievements(p: Profile = session.profile): void {
  const fresh = checkAchievements(p);
  if (!fresh.length) return;
  save();
  setTimeout(() => toast(`🏆 You’d already earned ${fresh.length} achievement${fresh.length > 1 ? 's' : ''}! See them in Trophies.`, 'gold', 5200), 1200);
}

// ------------------------------------------------------------------ the home screen panel

export function statsPanel(onOpen: () => void): HTMLElement {
  const p = session.profile;
  const s = summary(p);
  const cell = (label: string, value: string): HTMLElement => h('div.stat-cell', h('div.v', value), h('div.l', label));
  const pc = s.fav && FIGHTER_INDEX[s.fav] !== undefined ? FIGHTER_INDEX[s.fav] : -1;
  const portrait = liveCanvas(
    'fav-cv',
    (c, w, hh) => {
      if (pc < 0) {
        c.fillStyle = '#c9b6d8';
        c.font = `900 ${Math.round(hh * 0.5)}px Bungee, Impact, sans-serif`;
        c.textAlign = 'center';
        c.textBaseline = 'middle';
        c.fillText('?', w / 2, hh / 2 + 2);
        return;
      }
      const r = Math.min(w, hh) / 2 - 2;
      drawPortraitCached(c, pc, p.settings.palette[s.fav ?? ''] ?? 0, w / 2, hh / 2, r);
    },
    30,
  );
  const recent = p.recent
    .slice(0, 8)
    .reverse()
    .map((r) => h(`span.dot.${r.result === 'win' ? 'w' : 'l'}`, { title: `${r.result === 'win' ? 'Win' : 'Loss'} · ${r.mode} · ${FIGHTERS[FIGHTER_INDEX[r.fighter] ?? 0]?.def.name ?? r.fighter}` }));
  const latest = ACHIEVEMENTS.filter((a) => p.ach[a.id]).sort((a, b) => p.ach[b.id] - p.ach[a.id])[0];
  const next = ACHIEVEMENTS.filter((a) => !p.ach[a.id])
    .map((a) => ({ a, f: Math.min(1, a.progress(p) / a.goal) }))
    .sort((x, y) => y.f - x.f)[0];
  const el = h(
    'div.stats-panel.panel',
    { tabindex: '0', role: 'button', title: 'Stats & trophies', onclick: onOpen },
    h('div.row', h('h3.grow', '📊 Your stats'), h('span.chip.small', `🏆 ${s.ach[0]} / ${s.ach[1]}`)),
    h(
      'div.row.fav',
      portrait.el,
      h('div.col', { style: { gap: '2px' } }, h('div.tiny.dim', 'FAVOURITE BRO'), h('b', s.favName), h('div.tiny.dim', `Signature move: ${s.move}`)),
    ),
    h(
      'div.stat-grid',
      cell('Matches', fmtInt(s.matches)),
      cell('Win rate', s.matches ? `${Math.round(s.winRate * 100)}%` : '—'),
      cell('KOs', fmtInt(s.kos)),
      cell('Damage dealt', `${fmtInt(s.damage)}%`),
      cell('Best combo', s.combo ? `${s.combo} hits` : '—'),
      cell('Time played', fmtTime(s.time)),
      cell('Story', `${s.story[0]} / ${s.story[1]}`),
      cell('Classic best', s.classicBest ? `Int. ${s.classicBest}` : '—'),
      cell('Online wins', fmtInt(s.onlineWins)),
    ),
    recent.length ? h('div.row', { style: { gap: '6px' } }, h('span.tiny.dim', 'RECENT'), h('div.dots', recent)) : '',
    latest ? h('div.small', h('span.dim', 'Latest: '), `${latest.icon} ${latest.name}`) : '',
    next ? h('div.col', { style: { gap: '3px' } }, h('div.small', h('span.dim', 'Next up: '), `${next.a.icon} ${next.a.name}`), h('div.progress', h('div', { style: { width: `${Math.round(next.f * 100)}%` } }))) : h('div.small', 'Every achievement earned. Absolute legend.'),
    h('div.tiny.dim.center', 'Open for every stat and trophy'),
  );
  (el as HTMLElement & { stop?: () => void }).stop = portrait.stop;
  return el;
}

// ------------------------------------------------------------------ the Trophies screen

type Tab = 'ach' | 'tasks' | 'stats';
let lastTab: Tab = 'ach';

export function trophiesScreen(tab: Tab = lastTab): void {
  show((root) => {
    const p = session.profile;
    let cur = tab;
    const body = h('div.col', { style: { width: '100%', maxWidth: '1100px' } });
    const tabs = h('div.tabs');
    const render = (): void => {
      lastTab = cur;
      tabs.replaceChildren(
        ...(
          [
            ['ach', `🏆 Achievements (${achievementCount(p)}/${ACHIEVEMENTS.length})`],
            ['tasks', `🔓 Unlock tasks (${TASKS.filter((t) => p.done.includes(t.id) || p.unlocked.includes(t.fighter)).length}/${TASKS.length})`],
            ['stats', '📊 Statistics'],
          ] as [Tab, string][]
        ).map(([id, label]) => h(`button.tiny${id === cur ? '.on' : ''}`, { 'data-tab': id, onclick: () => ((cur = id), render()) }, label)),
      );
      body.replaceChildren(cur === 'ach' ? achList(p) : cur === 'tasks' ? taskList(p) : statsTable(p));
    };
    render();
    root.appendChild(
      h(
        'div.screen',
        h('div.topbar', h('button', { 'data-back': true, onclick: () => mainMenu() }, '◀ Back'), h('h2', 'Stats & trophies')),
        h('div', { style: { width: '100%', maxWidth: '1100px', marginBottom: '10px' } }, tabs),
        body,
        h('div', { style: { marginTop: '12px' } }, hintBar([['menuLB', 'Previous tab'], ['menuRB', 'Next tab'], ['menuBack', 'Back']], 18)),
      ),
    );
  });
}

function bar(frac: number): HTMLElement {
  return h('div.progress', h('div', { style: { width: `${Math.round(Math.max(0, Math.min(1, frac)) * 100)}%` } }));
}

function achList(p: Profile): HTMLElement {
  const items = ACHIEVEMENTS.map((a) => {
    const got = !!p.ach[a.id];
    const v = Math.min(a.goal, a.progress(p));
    return h(
      `div.ach-card${got ? '.got' : ''}`,
      { tabindex: '0' },
      h('div.ach-ico', a.icon),
      h(
        'div.col',
        { style: { gap: '3px', flex: '1', minWidth: '0' } },
        h('b', a.name),
        h('div.small', a.desc),
        got ? h('div.tiny.ok', `✔ Unlocked ${new Date(p.ach[a.id] * 1000).toLocaleDateString('en-GB')}`) : [bar(v / a.goal), h('div.tiny.dim', `${fmtInt(v)} / ${fmtInt(a.goal)}`)],
      ),
    );
  });
  return h('div.ach-grid', items);
}

function taskList(p: Profile): HTMLElement {
  return h(
    'div.col',
    h('div.small.dim', 'Finish a task and that contestant challenges you. Beat them to add them to your roster.'),
    h(
      'div.ach-grid',
      TASKS.map((t) => {
        const done = p.unlocked.includes(t.fighter);
        const waiting = !done && p.challengers.includes(t.fighter);
        const v = Math.min(t.goal, t.progress(p));
        const name = FIGHTERS[FIGHTER_INDEX[t.fighter]]?.def.name ?? t.fighter;
        return h(
          `div.ach-card${done ? '.got' : ''}`,
          { tabindex: '0' },
          h('div.ach-ico', done ? '🔓' : waiting ? '❗' : '🔒'),
          h('div.col', { style: { gap: '3px', flex: '1', minWidth: '0' } }, h('b', t.title), h('div.small', t.desc), done ? h('div.tiny.ok', `✔ ${name} joined the roster`) : waiting ? h('div.tiny', { style: { color: 'var(--gold)' } }, `${name} is waiting for you in Contestants!`) : [bar(v / t.goal), h('div.tiny.dim', `${fmtInt(v)} / ${fmtInt(t.goal)} · unlocks ???`)]),
        );
      }),
    ),
  );
}

function statsTable(p: Profile): HTMLElement {
  const s = summary(p);
  const st = (k: string): number => stat(p, k);
  const section = (title: string, rows: [string, string][]): HTMLElement => h('div.panel.col', h('h3', title), h('table.stats.lifetime', rows.map(([a, b]) => h('tr', h('td', a), h('td', b)))));
  const modeRows: [string, string][] = (['versus', 'online', 'story', 'classic', 'challenger'] as const).map((m) => [`${m[0].toUpperCase()}${m.slice(1)}`, `${fmtInt(st(`w_${m}`))} won / ${fmtInt(st(`m_${m}`))} played`]);
  const used = Object.entries(p.used)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([id, n]): [string, string] => [FIGHTERS[FIGHTER_INDEX[id]]?.def.name ?? id, `${fmtInt(n)} matches · ${fmtInt(p.wins[id] ?? 0)} wins`]);
  const moves = Object.entries(p.moves)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([id, n]): [string, string] => [moveName(id), `${fmtInt(n)} times`]);
  return h(
    'div.stats-cols',
    section('Overall', [
      ['Matches played', fmtInt(s.matches)],
      ['Matches won', `${fmtInt(s.wins)} (${s.matches ? Math.round(s.winRate * 100) : 0}%)`],
      ['Time in matches', fmtTime(s.time)],
      ['KOs', fmtInt(s.kos)],
      ['Falls', fmtInt(s.falls)],
      ['Self-destructs', fmtInt(s.sds)],
      ['Damage dealt', `${fmtInt(s.damage)}%`],
      ['Damage taken', `${fmtInt(st('taken'))}%`],
      ['Hits landed', fmtInt(st('hits'))],
      ['Longest combo', s.combo ? `${s.combo} hits` : '—'],
      ['Combos (3+ hits)', fmtInt(st('combos3'))],
      ['Most KOs in a match', fmtInt(st('bestKOs'))],
      ['Most damage in a match', `${fmtInt(st('bestDamage'))}%`],
      ['Flawless wins', fmtInt(st('flawless'))],
    ]),
    section('Technique', [
      ['Smash attacks', fmtInt(st('smashes'))],
      ['Parries', fmtInt(st('parries'))],
      ['Techs', fmtInt(st('techs'))],
      ['Meteor smashes', fmtInt(st('meteors'))],
      ['Ultimates', fmtInt(st('ults'))],
      ['Items used', fmtInt(st('items'))],
      ['Taunts', fmtInt(st('taunts'))],
      ['Favourite move', s.move],
      ...moves,
    ]),
    section('By mode', [...modeRows, ['Free-for-all wins (4 bros)', fmtInt(st('ffaWins'))], ['Team wins', fmtInt(st('teamWins'))], ['Matches with modifiers', fmtInt(st('modMatches'))]]),
    section('Progress', [
      ['Story', `${s.story[0]} / ${s.story[1]} segments`],
      ['Classic', s.classicCleared ? `${s.classicCleared} fighter${s.classicCleared > 1 ? 's' : ''} · best ${INTENSITY_NAMES[s.classicBest]} (${s.classicBest})` : 'not cleared yet'],
      ['Contestants', `${p.unlocked.length} / 16`],
      ['Unlock tasks', `${TASKS.filter((t) => p.done.includes(t.id) || p.unlocked.includes(t.fighter)).length} / ${TASKS.length}`],
      ['Achievements', `${s.ach[0]} / ${s.ach[1]}`],
      ['Online', `${fmtInt(s.onlineWins)} wins / ${fmtInt(s.onlineMatches)} matches`],
      ['Stages played', `${STAGES.filter((g) => st(`stage_${g.id}`) > 0).length} / ${STAGES.length}`],
    ]),
    section('Favourite bros', used.length ? used : [['No matches yet', 'Go smash some bros!']]),
  );
}
