// Classic: pick a fighter and an intensity, then eight rounds ending with Max Ratings and The Big BROadcast.
import { canvasEl, inMatch, mainMenu, show, backToMenus } from '../app';
import { session, save } from '../game/session';
import { localMatch } from '../game/match';
import { defaultDevice, deviceTapJump, type Device } from '../game/input';
import { classicRounds, INTENSITY_NAMES, type ClassicRound } from '../data/classic';
import { checkTasks } from '../data/tasks';
import { FIGHTER_INDEX, FIGHTERS } from '../sim/data';
import type { MatchCfg, State } from '../sim/types';
import { PLAYER_TINTS } from '../render/renderer';
import { audio } from '../audio/audio';
import { h, liveCanvas, toast } from './dom';
import { Picker, type SlotPick } from './picker';
import { drawFighterAt } from './portrait';
import { pauseMenu } from './pause';
import { playScene } from './storyUi';
import { recordMatch } from '../game/profile';
import { announceAchievements } from './achievementsUi';

export function classicScreen(): void {
  show((root) => {
    const p = session.profile;
    const slots: SlotPick[] = [
      { kind: 'human', fighter: p.unlocked[0], palette: p.settings.palette[p.unlocked[0]] ?? 0, cpu: 0, team: 0, device: defaultDevice(0), name: session.user?.name ?? 'P1' },
      { kind: 'off', fighter: 'kit', palette: 1, cpu: 0, team: 0, device: null, name: 'P2' },
    ];
    let intensity = 3;
    const picker = new Picker(slots, { unlocked: p.unlocked, teams: false, editable: () => true, canSwitchKind: (i) => i === 1, devices: true, onChange: () => slots.forEach((s) => s.kind === 'cpu' && (s.kind = 'human')), active: 0, maxSlots: 2, join: true, cpus: false });
    const label = h('span.chip', '');
    const paint = (): void => {
      label.textContent = `Intensity ${intensity}: ${INTENSITY_NAMES[intensity]}`;
    };
    paint();
    root.appendChild(
      h(
        'div.screen',
        h(
          'div.topbar',
          h('button', { 'data-back': true, onclick: () => (picker.destroy(), mainMenu()) }, '◀ Back'),
          h('h2', 'Classic'),
          h('button.tiny', { 'data-intensity': '-1', onclick: () => ((intensity = Math.max(1, intensity - 1)), paint()) }, '−'),
          label,
          h('button.tiny', { onclick: () => ((intensity = Math.min(9, intensity + 1)), paint()) }, '+'),
          h('button.big.primary', { 'data-pad-start': true, onclick: () => (picker.destroy(), runLadder(slots.filter((s) => s.kind === 'human'), intensity, 0)) }, 'Start ▶'),
        ),
        h('div.panel.small', { style: { maxWidth: '900px', marginBottom: '10px' } }, 'Eight rounds, then the host. Higher intensity = tougher CPUs and bragging rights. Add a second player for co-op Classic.'),
        picker.el,
      ),
    );
    return () => picker.destroy();
  });
}

function ladderView(rounds: ClassicRound[], at: number, fighter: string, onGo: () => void, onQuit: () => void): void {
  show((root) => {
    const cv = liveCanvas('ladcv', (c, w, hh, t) => drawFighterAt(c, fighter, session.profile.settings.palette[fighter] ?? 0, w / 2, hh * 0.95, hh * 0.85, t, 'idle'));
    cv.el.style.width = '220px';
    cv.el.style.height = '260px';
    const list = h(
      'div.list',
      rounds.map((r, i) =>
        h(
          `div.card${i === at ? '' : ''}`,
          { style: { opacity: i < at ? '0.5' : '1', outline: i === at ? '4px solid var(--gold)' : '', background: i === at ? 'rgba(255,207,58,0.12)' : '' } },
          h('b', `${i < at ? '✔ ' : i === at ? '▶ ' : ''}${r.title}`),
          h('div.small.dim', r.blurb),
        ),
      ),
    );
    root.appendChild(h('div.screen', h('div.topbar', h('button', { 'data-back': true, onclick: onQuit }, '✕ Quit run'), h('h2', 'Classic ladder'), h('button.big.primary', { 'data-pad-start': true, onclick: onGo }, 'Fight ▶')), h('div.row', { style: { alignItems: 'flex-start', gap: '18px', maxWidth: '1000px', width: '100%' } }, cv.el, h('div.grow', list))));
    return () => cv.stop();
  });
}

function runLadder(humans: SlotPick[], intensity: number, at: number): void {
  const fighter = humans[0].fighter;
  const rounds = classicRounds(fighter);
  ladderView(rounds, at, fighter, () => playRound(humans, intensity, rounds, at), () => classicScreen());
}

function playRound(humans: SlotPick[], intensity: number, rounds: ClassicRound[], at: number, bossPhase = false): void {
  const r = rounds[at];
  const p = session.profile;
  const cpu = Math.min(9, Math.max(1, intensity + (at >= 6 ? 1 : 0)));
  const final = at === rounds.length - 1;
  const players: MatchCfg['players'] = humans.map((s, i) => ({ fighter: s.fighter, color: s.palette, team: 0, cpu: 0, name: s.name || `P${i + 1}`, tapJump: deviceTapJump(s.device) }));
  if (final && bossPhase) {
    players.push({ fighter: 'max', color: 0, team: 1, cpu: 1, name: 'The Big BROadcast', tapJump: false, boss: 'broadcast', hpMult: 0.6 + intensity * 0.1 });
    players.push({ fighter: 'stagehand', color: 0, team: 1, cpu: Math.max(2, cpu - 2), name: 'Stagehand', tapJump: false, grunt: true });
  } else {
    for (const f of r.foes) players.push({ fighter: f.fighter, color: f.fighter === humans[0].fighter ? (humans[0].palette + 3) % 8 : (at + players.length) % 8, team: f.ally ? 0 : 1, cpu: f.ally ? Math.min(9, cpu + 1) : cpu, name: FIGHTERS[FIGHTER_INDEX[f.fighter]].def.name, tapJump: false, giant: f.giant, hpMult: f.giant ? 1.5 : 1, armor: f.boss ? 4 : undefined });
  }
  const gruntSlots = players.filter((pl) => pl.grunt);
  const cfg: MatchCfg = {
    seed: Math.floor(Math.random() * 2 ** 31),
    stage: r.stage,
    mode: 'stock',
    stocks: r.stocks,
    time: 0,
    hp: 150,
    items: 1,
    ult: 'meter',
    mods: r.mods ?? [],
    teams: true,
    friendlyFire: false,
    players,
    goal: final && bossPhase ? { kind: 'boss', waves: Array.from({ length: 60 }, () => gruntSlots) } : undefined,
  };
  const devices: (Device | null)[] = players.map((_, i) => (i < humans.length ? (humans[i].device ?? { kind: 'kb', index: 0, tapJump: false }) : null));
  const names = players.map((pl) => pl.name);
  const tints = players.map((pl, i) => (i < humans.length ? PLAYER_TINTS[i] : pl.team === 0 ? '#3ad27a' : '#9aa3b5'));
  const palettes = players.map((pl) => pl.color);
  inMatch();
  const m = localMatch(canvasEl, cfg, devices, { names, tints, palettes, local: devices.map((d) => !!d), objective: final ? (bossPhase ? 'THE BIG BRO-ADCAST!' : 'MAX RATINGS!') : r.title.toUpperCase() }, {
    onEnd: (st: State) => {
      backToMenus();
      recordMatch(p, st, { mode: 'classic', local: humans.map((_, i) => i) });
      checkTasks(p);
      announceAchievements(p);
      save();
      const won = cfg.goal ? st.winner.length > 0 : st.winner.some((w) => st.cfg.players[w]?.team === 0);
      if (!won) {
        show((root) => {
          root.appendChild(
            h(
              'div.screen',
              { style: { justifyContent: 'center' } },
              h('div.panel.col', { style: { alignItems: 'center', width: 'min(520px, 92vw)' } }, h('h2', 'CONTINUE?'), h('div.dim', 'Even the best bros take a fall. Get back up.'), h('div.row', h('button.big.primary', { 'data-pad-start': true, onclick: () => playRound(humans, intensity, rounds, at, bossPhase) }, 'Continue'), h('button.big', { onclick: () => classicScreen() }, 'Give up'))),
            ),
          );
        });
        return;
      }
      if (final && !bossPhase) {
        void playScene([{ who: 'max', text: 'You beat ME? Unacceptable! CAMERA! Bring in the big guns!' }], humans[0].fighter).then(() => playRound(humans, intensity, rounds, at, true));
        return;
      }
      if (final) return void ending(humans[0].fighter, intensity);
      runLadder(humans, intensity, at + 1);
    },
    onPause: (resume, quit) => pauseMenu(resume, quit),
    onQuit: () => (backToMenus(), classicScreen()),
  });
  m.start();
  audio.sfx('go');
}

async function ending(fighter: string, intensity: number): Promise<void> {
  const p = session.profile;
  p.classic[fighter] = Math.max(p.classic[fighter] ?? 0, intensity);
  const fresh = checkTasks(p);
  announceAchievements(p);
  save();
  const def = FIGHTERS[FIGHTER_INDEX[fighter]].def;
  await playScene(
    [
      { who: fighter, text: def.wins[0] ?? 'We did it!' },
      { who: 'cue', text: `(holds up a sign: ${def.name.toUpperCase()} — CLASSIC CHAMPION — INTENSITY ${intensity})` },
      { who: fighter, text: def.line },
    ],
    fighter,
  );
  if (fresh.length) toast(`Task complete: ${fresh.map((t) => t.title).join(', ')}! A new contestant wants to fight.`, 'gold', 6000);
  void import('./roster').then((r) => {
    r.queueChallengers();
    void r.afterMatchChallengers(() => mainMenu());
  });
}
