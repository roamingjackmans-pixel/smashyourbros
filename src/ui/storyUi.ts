// Story mode: the episode map, comic dialogue scenes, and the fights (local co-op up to four, or with an online
// lobby through onlineUi). Clearing a segment saves it; beaten rivals unlock through their tasks.
import { canvasEl, inMatch, mainMenu, show, backToMenus } from '../app';
import { session, save } from '../game/session';
import { localMatch } from '../game/match';
import type { Device } from '../game/input';
import { EPISODES, foeConfigs, nextNode, unlockedNode, type Line, type StoryNode } from '../data/story';
import { checkTasks } from '../data/tasks';
import { FIGHTER_INDEX, FIGHTERS } from '../sim/data';
import type { MatchCfg, PlayerCfg, State } from '../sim/types';
import { PLAYER_TINTS } from '../render/renderer';
import { OUTLINE, rrect } from '../render/art';
import { audio } from '../audio/audio';
import { h, liveCanvas, uiRoot } from './dom';
import { Picker, type SlotPick } from './picker';
import { drawFighterAt } from './portrait';
import { pauseMenu } from './pause';
import { resultsScreen } from './results';

// ------------------------------------------------------------------ dialogue

function drawCue(c: CanvasRenderingContext2D, w: number, hh: number, t: number): void {
  // Cue: a nervous floating cue-card robot
  const bob = Math.sin(t * 0.08) * 4;
  c.save();
  c.translate(w / 2, hh / 2 + bob);
  const s = Math.min(w, hh) / 130;
  c.scale(s, s);
  rrect(c, -40, -34, 80, 56, 8);
  c.fillStyle = '#f4f1ea';
  c.fill();
  c.lineWidth = 4;
  c.strokeStyle = OUTLINE;
  c.stroke();
  c.fillStyle = OUTLINE;
  c.font = '900 13px Bungee, Impact';
  c.textAlign = 'center';
  c.fillText(t % 120 < 60 ? 'APPLAUSE' : 'HELP?', 0, -4);
  c.beginPath();
  c.arc(-14, 12, 4, 0, Math.PI * 2);
  c.arc(14, 12, 4, 0, Math.PI * 2);
  c.fill();
  c.strokeStyle = '#9aa3b5';
  c.lineWidth = 5;
  c.beginPath();
  c.moveTo(0, 22);
  c.lineTo(0, 40);
  c.stroke();
  c.fillStyle = '#3affd5';
  c.beginPath();
  c.ellipse(0, 46, 16, 5, 0, 0, Math.PI * 2);
  c.fill();
  c.restore();
}

/** play a scene; resolves when done (click / Space / A to advance, Esc to skip) */
export function playScene(lines: Line[], you: string): Promise<void> {
  return new Promise((resolve) => {
    if (!lines.length) return resolve();
    let i = 0;
    let shown = 0;
    let speaker = '';
    const name = h('span.spk');
    const text = h('span');
    const bubble = h('div.bubble', name, text, h('div.hint', 'click / Space to continue · Esc to skip'));
    const pcv = liveCanvas('portrait', (c, w, hh, t) => {
      const who = speaker;
      if (who === 'cue') return drawCue(c, w, hh, t);
      if (who === 'crowd') {
        c.fillStyle = '#ffcf3a';
        c.font = `900 ${Math.round(hh * 0.25)}px Bungee, Impact`;
        c.textAlign = 'center';
        c.fillText('👏👏', w / 2, hh * 0.6);
        return;
      }
      const id = who === 'you' ? you : who;
      if (FIGHTER_INDEX[id] === undefined) return;
      drawFighterAt(c, id, 0, w / 2, hh * 1.55, hh * 1.7, t, 'idle', 1);
    });
    pcv.el.classList.add('portrait');
    const el = h('div.dialogue', pcv.el, bubble);
    const back = h('div.screen.clear', { style: { background: 'linear-gradient(180deg, transparent 40%, rgba(10,4,18,0.75))' } }, el);
    uiRoot().appendChild(back);
    let timer = 0;
    const setLine = (): void => {
      const l = lines[i];
      speaker = l.who;
      const nm = l.who === 'you' ? FIGHTERS[FIGHTER_INDEX[you]]?.def.name : l.who === 'cue' ? 'Cue' : l.who === 'crowd' ? 'The Studio Audience' : l.who === 'max' ? 'Max Ratings' : FIGHTERS[FIGHTER_INDEX[l.who]]?.def.name;
      name.textContent = nm ?? l.who;
      shown = 0;
      clearInterval(timer);
      timer = window.setInterval(() => {
        shown = Math.min(l.text.length, shown + 2);
        text.textContent = l.text.slice(0, shown);
        if (shown % 6 === 0) audio.sfx('menu');
        if (shown >= l.text.length) clearInterval(timer);
      }, 22);
    };
    const advance = (): void => {
      const l = lines[i];
      if (shown < l.text.length) {
        shown = l.text.length;
        text.textContent = l.text;
        clearInterval(timer);
        return;
      }
      i++;
      if (i >= lines.length) return finish();
      setLine();
    };
    const finish = (): void => {
      clearInterval(timer);
      window.removeEventListener('keydown', onKey);
      clearInterval(padIv);
      pcv.stop();
      back.remove();
      resolve();
    };
    const onKey = (e: KeyboardEvent): void => {
      if (e.code === 'Space' || e.code === 'Enter' || e.code === 'KeyJ') {
        e.preventDefault();
        advance();
      }
      if (e.code === 'Escape') finish();
    };
    let padPrev = false;
    const padIv = window.setInterval(() => {
      const pads = navigator.getGamepads ? navigator.getGamepads() : [];
      let a = false;
      for (const g of pads) if (g?.buttons[0]?.pressed) a = true;
      if (a && !padPrev) advance();
      padPrev = a;
    }, 50);
    back.addEventListener('click', advance);
    window.addEventListener('keydown', onKey);
    setLine();
  });
}

export function introCard(then: () => void): void {
  void playScene(
    [
      { who: 'max', text: 'Oh! A new viewer! Welcome, welcome, to the number-one show in the galaxy: SMASH YOUR BROS LIVE!' },
      { who: 'cue', text: '(holds up a sign: APPLAUSE)' },
      { who: 'max', text: 'Here, best friends fight each other for the glory of ratings! Nothing weird is going on! Please do not look behind the giant camera!' },
      { who: 'cue', text: '(flips the sign: PLEASE LOOK BEHIND THE GIANT CAMERA)' },
      { who: 'max', text: 'Pick a mode, champ. Story mode is where the drama is. I mean the fun. The FUN.' },
    ],
    'kit',
  ).then(then);
}

// ------------------------------------------------------------------ the map

export function storyScreen(): void {
  show((root) => {
    const p = session.profile;
    const cleared = p.story.cleared;
    const next = nextNode(cleared);
    const map = h('div.story-map');
    for (const ep of EPISODES) {
      const open = unlockedNode(cleared, ep.nodes[0].id);
      const done = ep.nodes.every((n) => cleared.includes(n.id));
      const nodes = h('div.nodes');
      for (const n of ep.nodes) {
        const ok = unlockedNode(cleared, n.id);
        const isDone = cleared.includes(n.id);
        const icon = n.kind === 'ko' ? '🤖' : n.kind === 'survive' ? '⏱' : n.kind === 'boss' ? '📹' : n.foes.some((f) => f.ally) ? '🤝' : '🥊';
        const el = h(`div.node${isDone ? '.done' : ''}${next?.id === n.id ? '.next' : ''}${ok ? '' : '.locked'}`, h('div', h('b', `${icon} ${n.title}`)), h('div.small', n.blurb));
        if (ok) el.addEventListener('click', () => storySetup(n));
        nodes.appendChild(el);
      }
      map.appendChild(h(`div.episode${open ? '' : '.locked'}`, h('div.row', h('h3.grow', `Episode ${ep.n}: ${ep.title}`), h('span.small.dim', done ? '✔ cleared' : ep.tagline)), nodes));
    }
    root.appendChild(
      h(
        'div.screen',
        h('div.topbar', h('button', { onclick: () => mainMenu() }, '◀ Back'), h('h2', 'Prime-Time Brawl'), session.online ? h('button.teal', { onclick: () => void import('./onlineUi').then((m) => m.onlineScreen(undefined, 'story')) }, '🌐 Play with friends online') : '', next ? h('button.big.primary', { onclick: () => storySetup(next) }, `▶ ${next.title}`) : h('span.chip', '★ Season complete!')),
        map,
      ),
    );
  });
}

/** pick fighters (1-4 local players) for a story segment */
function storySetup(n: StoryNode): void {
  show((root) => {
    const p = session.profile;
    const slots: SlotPick[] = [
      { kind: 'human', fighter: p.unlocked[0], palette: 0, cpu: 0, team: 0, device: { kind: 'kb', index: 0, tapJump: p.settings.tapJumpKb }, name: session.user?.name ?? 'P1' },
      { kind: 'off', fighter: 'kit', palette: 1, cpu: 0, team: 0, device: null, name: 'P2' },
      { kind: 'off', fighter: 'kit', palette: 2, cpu: 0, team: 0, device: null, name: 'P3' },
      { kind: 'off', fighter: 'kit', palette: 3, cpu: 0, team: 0, device: null, name: 'P4' },
    ];
    const picker = new Picker(slots, {
      unlocked: p.unlocked,
      teams: false,
      editable: () => true,
      canSwitchKind: (i) => i > 0,
      devices: true,
      onChange: () => {
        // story slots are humans or off (couch co-op)
        for (const s of slots) if (s.kind === 'cpu') s.kind = 'human';
      },
      active: 0,
    });
    root.appendChild(
      h(
        'div.screen',
        h('div.topbar', h('button', { onclick: () => (picker.destroy(), storyScreen()) }, '◀ Map'), h('h2', n.title), h('button.big.primary', { onclick: () => (picker.destroy(), void runNode(n, slots.filter((s) => s.kind === 'human'))) }, 'Roll camera ▶')),
        h('div.panel.small', { style: { maxWidth: '900px', marginBottom: '10px' } }, n.blurb, h('div.dim', 'Couch co-op: add up to three more players on this device (👤 on a slot).')),
        picker.el,
      ),
    );
    return () => picker.destroy();
  });
}

/** the match config for a story segment */
export function nodeCfg(n: StoryNode, humans: PlayerCfg[]): MatchCfg {
  const foes = foeConfigs(n, humans.length);
  const players = [...humans.map((hm) => ({ ...hm, team: 0 })), ...foes];
  const cfg: MatchCfg = {
    seed: Math.floor(Math.random() * 2 ** 31),
    stage: n.stage,
    mode: 'stock',
    stocks: n.stocks ?? 2,
    time: 0,
    hp: 150,
    items: n.items ?? 1,
    ult: 'meter',
    mods: n.mods ?? [],
    teams: true,
    friendlyFire: false,
    players,
  };
  const gruntSlots = foes.filter((f) => f.grunt);
  if (n.kind === 'survive') cfg.goal = { kind: 'survive', frames: (n.target ?? 40) * 60, waves: Array.from({ length: 40 }, () => gruntSlots) };
  else if (n.kind === 'ko') cfg.goal = { kind: 'ko', count: n.target ?? 6, waves: Array.from({ length: 40 }, () => gruntSlots) };
  else if (n.kind === 'boss') cfg.goal = { kind: 'boss', waves: Array.from({ length: 60 }, () => gruntSlots) };
  return cfg;
}

async function runNode(n: StoryNode, humans: SlotPick[]): Promise<void> {
  const you = humans[0]?.fighter ?? 'kit';
  show(() => {});
  await playScene(n.before ?? [], you);
  const hcfg: PlayerCfg[] = humans.map((s, i) => ({ fighter: s.fighter, color: s.palette, team: 0, cpu: 0, name: s.name || `P${i + 1}`, tapJump: s.device?.kind === 'pad' ? session.profile.settings.tapJumpPad : session.profile.settings.tapJumpKb }));
  const cfg = nodeCfg(n, hcfg);
  const devices: (Device | null)[] = cfg.players.map((_, i) => (i < humans.length ? (humans[i].device ?? { kind: 'kb', index: 0, tapJump: false }) : null));
  const names = cfg.players.map((pl, i) => (i < humans.length ? pl.name : FIGHTERS[FIGHTER_INDEX[pl.fighter]].def.name));
  const tints = cfg.players.map((pl, i) => (i < humans.length ? PLAYER_TINTS[i] : pl.team === 0 ? '#3ad27a' : '#9aa3b5'));
  const palettes = cfg.players.map((pl) => pl.color);
  inMatch();
  const objective = n.kind === 'ko' ? `KO ${n.target} STAGEHAND BOTS!` : n.kind === 'survive' ? `SURVIVE ${n.target} SECONDS!` : n.kind === 'boss' ? 'HIT THE LENS!' : n.title.toUpperCase();
  const m = localMatch(canvasEl, cfg, devices, { names, tints, palettes, local: devices.map((d) => !!d), objective }, {
    onEnd: (st: State) => void finishNode(n, st, humans, names, palettes, tints),
    onPause: (resume, quit) => pauseMenu(resume, quit),
    onQuit: () => (backToMenus(), storyScreen()),
  });
  m.start();
}

async function finishNode(n: StoryNode, st: State, humans: SlotPick[], names: string[], palettes: number[], tints: string[]): Promise<void> {
  backToMenus();
  const humanIdx = humans.map((_, i) => i);
  const won = st.cfg.goal ? st.winner.length > 0 : st.winner.some((w) => humanIdx.includes(w) || st.cfg.players[w]?.team === 0);
  const p = session.profile;
  if (won && !p.story.cleared.includes(n.id)) p.story.cleared.push(n.id);
  save();
  if (won) await playScene(n.after ?? [], humans[0]?.fighter ?? 'kit');
  checkTasks(p);
  const res = resultsScreen({
    st,
    names,
    palettes,
    tints,
    ctx: { mode: 'story', local: humanIdx },
    title: won ? `${n.title}: CLEARED!` : 'CUT! TAKE TWO?',
    actions: won
      ? [
          { label: 'Next segment', cls: 'primary', fn: () => void import('./roster').then((r) => r.afterMatchChallengers(() => storyScreen())) },
          { label: 'Main menu', fn: () => mainMenu() },
        ]
      : [
          { label: 'Retry', cls: 'primary', fn: () => void runNode(n, humans) },
          { label: 'Story map', fn: () => storyScreen() },
        ],
  });
  void res;
  void import('./roster').then((r) => r.queueChallengers());
}
