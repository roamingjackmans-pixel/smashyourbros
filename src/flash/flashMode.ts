// FlashGames mode (D27, docs/DESIGN.md §7): opened with ?flash=…, the game skips every menu and the save and plays
// the day's seeded Classic ladder solo against CPUs, with the day's modifiers, until a round is lost or the 15
// minutes are up. The rules and the score are in ./rules.ts; this file runs the matches, reads the controls and
// draws the corner HUD and the cards between fights. Nothing here touches the profile, tasks, stats or the server.
import './flash.css';
import { audio } from '../audio/audio';
import { lastInputKind, padLayout, readDevice, readPad, type Device } from '../game/input';
import { Match, type Driver } from '../game/match';
import { lastActivePad, padList } from '../game/pads';
import { PLAYER_TINTS, type ViewOpts } from '../render/renderer';
import { FIGHTER_INDEX, FIGHTERS } from '../sim/data';
import { ib, ic, ix, iy, NEUTRAL, pack } from '../sim/input';
import { initState, step } from '../sim/sim';
import type { MatchCfg, State } from '../sim/types';
import { h } from '../ui/dom';
import { FIRST_FIGHT, FLASH_INFO, FlashScore, fightSetup, fightWon, intensityFor, nextFight, playerKos, POINTS, roundPoints, runRules, type Fight, type FightSetup, type Rng } from './rules';

const KB: Device = { kind: 'kb', index: 0, tapJump: false };

/** this frame's controls: the default keyboard and every connected pad at once (whoever is holding something) */
function readAll(): number {
  const k = readDevice(KB);
  let x = ix(k);
  let y = iy(k);
  let b = ib(k);
  let c = ic(k);
  // pads are read directly: a pad still works while the FlashGames page around the iframe has the focus
  for (const p of padList()) {
    const v = readPad(p, padLayout(0), `${p.index}:flash`);
    if (Math.abs(ix(v)) > Math.abs(x)) x = ix(v);
    if (Math.abs(iy(v)) > Math.abs(y)) y = iy(v);
    b |= ib(v);
    if (!c) c = ic(v);
  }
  return pack(x, y, b, c);
}

/** a local match with slot 0 on readAll(); `after` sees every simulated frame (KOs, the end of the fight) */
class FlashDriver implements Driver {
  readonly online = false;
  st: State;
  constructor(
    cfg: MatchCfg,
    private after: (st: State) => void,
  ) {
    this.st = initState(cfg);
  }
  state(): State {
    return this.st;
  }
  deviceFor(slot: number): Device | null {
    if (slot !== 0) return null;
    const p = lastActivePad();
    return p && lastInputKind() === 'pad' ? { kind: 'pad', index: p.index, port: 0, tapJump: padLayout(0).tapJump } : KB;
  }
  tick(onStep: (st: State) => void): void {
    // tap jump follows the device in use (pads on, keyboard off, as everywhere else in the game)
    const me = this.st.cfg.players[0];
    if (me) me.tapJump = lastInputKind() === 'pad' ? padLayout(0).tapJump : false;
    const inputs = this.st.cfg.players.map((_, i) => (i === 0 ? readAll() : NEUTRAL));
    step(this.st, inputs);
    onStep(this.st);
    this.after(this.st);
  }
}

const fmt = (n: number): string => Math.round(n).toLocaleString('en-US');
const fighterName = (id: string): string => FIGHTERS[FIGHTER_INDEX[id]]?.def.name ?? id;

/** the corner HUD and the centre cards */
class Hud {
  el = h('div#flash');
  private n = h('div.fl-n', '0');
  private d = h('div.fl-d', '');
  private r = h('div.fl-r', '');
  private pop = h('div.fl-pop', '');
  private card = h('div.fl-card', { hidden: true });
  private popTimer = 0;

  constructor(mods: readonly string[]) {
    const info = new Map(FLASH_INFO.modifiers.map((m) => [m.id, m]));
    const chips = mods.map((id) => info.get(id)).filter((m) => !!m);
    this.el.append(
      h('div.fl-score', this.n, this.d, this.r),
      h(
        'div.fl-mods',
        chips.map((m) => h('div.fl-mod', { title: m.text }, h('b', m.name), h('span', m.text))),
      ),
      this.pop,
      this.card,
    );
    document.body.appendChild(this.el);
  }

  /** the modifiers' descriptions show through the countdown and the first seconds of play, then just their names */
  brief(afterMs: number): void {
    setTimeout(() => this.el.classList.add('brief'), afterMs);
  }

  score(total: number, detail: string): void {
    this.n.textContent = fmt(total);
    this.d.textContent = detail;
  }

  where(text: string): void {
    this.r.textContent = text;
  }

  points(p: number): void {
    if (p <= 0) return;
    this.pop.textContent = `+${fmt(p)}`;
    this.pop.classList.remove('on');
    void this.pop.offsetWidth;
    this.pop.classList.add('on');
    clearTimeout(this.popTimer);
    this.popTimer = window.setTimeout(() => this.pop.classList.remove('on'), 1100);
  }

  show(cls: string, ...children: (HTMLElement | string)[]): void {
    this.card.className = `fl-card ${cls}`;
    this.card.replaceChildren(...children);
    this.card.hidden = false;
  }

  hide(): void {
    this.card.hidden = true;
  }
}

export interface FlashHandle {
  match: Match | null;
  fight: Fight;
  score: FlashScore;
  setup: FightSetup | null;
  ended: string;
}

export async function bootFlash(canvas: HTMLCanvasElement): Promise<void> {
  const FR = window.FlashRun;
  const rules = runRules(FR.mods);
  const rng: Rng = (salt) => FR.rng(salt);
  const score = new FlashScore();
  const hud = new Hud(FR.mods);
  const run: FlashHandle = { match: null, fight: FIRST_FIGHT, score, setup: null, ended: '' };
  // for the browser checks (read-only use): the live match, where the run is, the score
  (window as unknown as { sybFlash: FlashHandle }).sybFlash = run;
  let next = 0;

  // keyboard focus inside the iframe: take it now and whenever the game is clicked
  const focus = (): void => {
    try {
      window.focus();
    } catch {
      /* not allowed */
    }
  };
  focus();
  window.addEventListener('pointerdown', focus);

  const report = (): void => {
    score.loop = run.fight.loop;
    FR.score(score.total, score.detail());
    hud.score(score.total, score.detail());
  };

  const finish = (reason: 'dead' | 'time'): void => {
    if (run.ended) return;
    run.ended = reason;
    clearTimeout(next);
    // time's up: freeze where it stands. A lost round: the sim is over already; its slow-motion replay plays on
    // behind the card and then the match stops itself.
    if (reason === 'time') run.match?.stop();
    FR.over(score.total, score.detail(), reason);
    const s = run.setup;
    hud.show(
      'final',
      h('h2', reason === 'time' ? 'TIME!' : 'KNOCKED OUT!'),
      h('div.fl-big', fmt(score.total)),
      h('p', score.detail()),
      h('p', s ? `${reason === 'time' ? 'Last seen on' : 'Fell on'} ${s.title}${run.fight.loop > 1 ? ` (loop ${run.fight.loop})` : ''} as ${fighterName(s.fighter)}.` : ''),
      h('p.fl-say', reason === 'time' ? 'That’s the show, bros! Same time tomorrow.' : 'Even the best bros take a fall. See you tomorrow, champ.'),
    );
  };
  FR.onEnd(() => finish('time'));

  const view = (s: FightSetup): ViewOpts => {
    const ps = s.cfg.players;
    return {
      names: ps.map((p) => p.name),
      tints: ps.map((p, i) => (i === 0 ? PLAYER_TINTS[0] : p.team === 0 ? '#3ad27a' : '#9aa3b5')),
      palettes: ps.map((p) => p.color),
      local: ps.map((_, i) => i === 0),
      objective: s.objective,
    };
  };

  const build = (first: boolean): Match => {
    const fight = run.fight;
    const s = fightSetup(rules, rng, fight);
    run.setup = s;
    // the camera's HP bar runs along the top: the corner boxes step down out of its way
    hud.el.classList.toggle('boss', s.kind === 'broadcast');
    hud.where(`${s.title} · ${fighterName(s.fighter)}${fight.loop > 1 || rules.hardest ? ` · CPU ${s.intensity}` : ''}`);
    let decided = false;
    const driver = new FlashDriver(s.cfg, (st) => {
      if (run.ended) return;
      const kos = playerKos(st);
      if (kos.length) {
        for (const k of kos) hud.points(score.ko(fight.loop, k.grunt));
        report();
      }
      if (st.over && !decided) {
        decided = true;
        if (fightWon(st)) {
          hud.points(score.round(s.kind, fight.loop, st.fighters[0]?.stocks ?? 0, st.timer));
          report();
        } else finish('dead');
      }
    });
    // FlashGames has just counted 3-2-1: the first fight starts at GO
    if (first) driver.st.intro = 0;
    const m = new Match(canvas, driver, view(s), {
      onEnd: (st) => {
        if (run.ended) return;
        between(s, st);
      },
    });
    m.speed = rules.speed;
    run.match = m;
    return m;
  };

  /** the card between two fights, then the next fight */
  const between = (s: FightSetup, st: State): void => {
    const done = run.fight;
    const me = st.fighters[0];
    const pts = roundPoints(s.kind, done.loop, me?.stocks ?? 0, st.timer);
    const stocks = POINTS.stock * Math.max(0, me?.stocks ?? 0) * done.loop;
    run.fight = nextFight(done);
    const up = fightSetup(rules, rng, run.fight);
    const lines: (HTMLElement | string)[] = [
      h('h2', s.kind === 'broadcast' ? `LOOP ${done.loop} CLEAR!` : s.kind === 'max' ? 'MAX IS DOWN!' : 'ROUND CLEAR!'),
      h('div.fl-big', `+${fmt(pts.total)}`),
      h('p', `Win ${fmt((POINTS.win + (s.kind === 'max' ? POINTS.max : s.kind === 'broadcast' ? POINTS.broadcast : 0)) * done.loop)} · Stocks ${fmt(stocks)} · Speed ${fmt(pts.speed)}`),
    ];
    if (s.kind === 'max') lines.push(h('p.fl-say', 'MAX RATINGS: You beat ME? Unacceptable! CAMERA! Bring in the big guns!'));
    if (s.kind === 'broadcast') lines.push(h('p.fl-say', `The show must go on! Loop ${run.fight.loop}: CPUs at intensity ${intensityFor(rules, run.fight.loop)}, every point ×${run.fight.loop}.`));
    lines.push(h('p', `Next: ${up.title}${up.fighter !== s.fighter ? ` · you’re ${fighterName(up.fighter)} now` : ''}`));
    hud.show('', ...lines);
    report();
    next = window.setTimeout(
      () => {
        if (run.ended) return;
        hud.hide();
        build(false).start();
        audio.sfx('go');
      },
      s.kind === 'round' ? 1700 : 3000,
    );
  };

  // the HUD shows 0 from the start; FlashGames hears about the score once there is one
  hud.score(score.total, score.detail());
  const first = build(true);
  // the stage shows behind FlashGames' countdown (and after any resize while it counts)
  const paint = (): void => {
    if (!first.stopped && !FR.running() && !run.ended) first.r.draw(first.st, first.view, 0);
  };
  paint();
  window.addEventListener('resize', paint);
  await FR.ready();
  window.removeEventListener('resize', paint);
  if (run.ended) return;
  focus();
  first.start();
  audio.sfx('go');
  hud.brief(6000);
}
