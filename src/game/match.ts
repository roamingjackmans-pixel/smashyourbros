// Running a match: the fixed 60 Hz loop, the slow-motion replay of the winning hit, pause, the "waiting for…"
// banner online. Where the frames come from is a Driver: LocalDriver steps the simulation with this machine's
// devices; OnlineDriver (net/online.ts) runs the rollback session.
import { A } from '../sim/acts';
import { NEUTRAL } from '../sim/input';
import { cloneState, initState, step } from '../sim/sim';
import type { MatchCfg, State } from '../sim/types';
import { bigText } from '../render/hud';
import { Renderer, type ViewOpts } from '../render/renderer';
import { pausePressed, readDevice, type Device } from './input';
import { getPad, pollPads, rumble } from './pads';
import type { Ev } from '../sim/types';
import { toast } from '../ui/dom';
import { audio } from '../audio/audio';
import { screenT } from '../render/art';
import { perfWork } from './perf';
import { MatchTracker } from './stats';

export interface Driver {
  readonly online: boolean;
  state(): State;
  /** one 60 Hz tick; call onStep after every simulated frame (including replays after a rollback) */
  tick(onStep: (st: State) => void): void;
  /** text for a banner while stalled (online) */
  waiting?(): string | null;
  stop?(): void;
  /** the device playing a slot on this machine, if any (pause, rumble) */
  deviceFor?(slot: number): Device | null;
}

export class LocalDriver implements Driver {
  readonly online = false;
  st: State;
  constructor(
    cfg: MatchCfg,
    public devices: (Device | null)[],
  ) {
    this.st = initState(cfg);
  }
  state(): State {
    return this.st;
  }
  deviceFor(slot: number): Device | null {
    return this.devices[slot] ?? null;
  }
  tick(onStep: (st: State) => void): void {
    const inputs = this.devices.map((d) => (d ? readDevice(d) : NEUTRAL));
    step(this.st, inputs);
    onStep(this.st);
  }
}

export interface MatchHooks {
  onEnd: (st: State) => void;
  /** quit from the pause menu (defaults to onEnd) */
  onQuit?: () => void;
  onPause?: (resume: () => void, quit: () => void) => void;
}

const STEP = 1 / 60;

export class Match {
  r: Renderer;
  private raf = 0;
  private acc = 0;
  private last = 0;
  private hist: State[] = [];
  private replay: { states: State[]; i: number; sub: number; x: number; y: number; acc: number } | null = null;
  /** time since the canvas was last drawn (the renderer's clocks advance by it) */
  private drawDt = 0;
  private drawnAt = 0;
  private ended = false;
  private paused = false;
  private sawOver = false;
  stopped = false;
  /** game speed: simulated seconds per real second (1 everywhere but FlashGames' "Fast Forward", D27) */
  speed = 1;

  constructor(
    canvas: HTMLCanvasElement,
    public driver: Driver,
    public view: ViewOpts,
    public hooks: MatchHooks,
  ) {
    this.r = new Renderer(canvas);
    const local = view.local.map((l, i) => (l ? i : -1)).filter((i) => i >= 0);
    this.tracker = local.length ? new MatchTracker(local) : null;
    this.r.fx.onEvent = (e, st) => {
      audio.event(e, st);
      this.tracker?.event(e, st);
      this.rumbleFor(e, st);
    };
  }

  /** the pad playing a slot here, or -1 */
  private padOf(slot: number): number {
    const d = this.driver.deviceFor?.(slot);
    return d && d.kind === 'pad' ? d.index : -1;
  }

  /** controller rumble on hits, KOs, parries, shield breaks and ultimates (D23; Settings → Controls → Rumble) */
  private rumbleFor(e: Ev, st: State): void {
    if (e.p < 0 || !this.driver.deviceFor) return;
    const buzz = (slot: number, strong: number, weak: number, ms: number): void => {
      const pad = this.padOf(slot);
      if (pad >= 0) rumble(pad, strong, weak, ms);
    };
    switch (e.t) {
      case 'hit': {
        const dmg = e.a ?? 5;
        const kb = e.b ?? 30;
        buzz(e.p, 0.1, Math.min(0.6, 0.2 + dmg * 0.02), 70 + Math.min(80, dmg * 4));
        // the one who got hit: the bro in hitlag last hit by this attacker
        for (const f of st.fighters) if (f.i !== e.p && f.hitlag > 0 && f.lastHitBy === e.p) buzz(f.i, Math.min(1, kb / 140), Math.min(1, 0.3 + kb / 200), 90 + Math.min(200, kb * 1.2));
        break;
      }
      case 'ko': {
        buzz(e.p, 1, 0.9, 480);
        const killer = st.fighters[e.p]?.lastHitBy ?? -1;
        if (killer >= 0 && killer !== e.p) buzz(killer, 0.55, 0.45, 260);
        break;
      }
      case 'parry':
        buzz(e.p, 0, 0.7, 90);
        break;
      case 'break':
        buzz(e.p, 0.9, 0.6, 520);
        break;
      case 'ult':
        buzz(e.p, 0.5, 0.5, 320);
        break;
    }
  }

  get st(): State {
    return this.driver.state();
  }

  start(): void {
    this.last = performance.now();
    audio.music(this.st);
    const loop = (now: number): void => {
      if (this.stopped) return;
      this.raf = requestAnimationFrame(loop);
      this.frame(now);
    };
    this.raf = requestAnimationFrame(loop);
    window.addEventListener('keydown', this.onKey);
  }

  stop(): void {
    this.stopped = true;
    cancelAnimationFrame(this.raf);
    window.removeEventListener('keydown', this.onKey);
    this.driver.stop?.();
    audio.stopMusic();
  }

  private onKey = (e: KeyboardEvent): void => {
    if (e.code === 'Escape' && !this.st.over && !this.replay && !this.driver.online) this.togglePause();
    if (e.code === 'KeyH' && e.ctrlKey) {
      e.preventDefault();
      this.view.boxes = !this.view.boxes;
    }
  };

  private togglePause(): void {
    if (this.paused || !this.hooks.onPause) return;
    this.paused = true;
    audio.sfx('menu');
    this.hooks.onPause(
      () => {
        this.paused = false;
        this.last = performance.now();
        this.acc = 0;
      },
      () => {
        this.stop();
        if (this.hooks.onQuit) this.hooks.onQuit();
        else this.hooks.onEnd(this.st);
      },
    );
  }

  private padsSeen = new Set<number>();
  /** combos, moves and taunts for the lifetime stats (D24) */
  tracker: MatchTracker | null;
  private frame(now: number): void {
    const t0 = performance.now();
    this.step(now);
    perfWork(performance.now() - t0);
  }

  private step(now: number): void {
    const raw = now - this.last;
    const dt = Math.min(0.1, raw / 1000);
    this.last = now;
    if (!this.paused) this.r.res.note(raw, now);
    pollPads();
    if (!this.paused && !this.replay && !this.st.over) {
      // any local player's Pause button; a player's controller unplugged pauses too (D23)
      for (let i = 0; i < this.st.fighters.length; i++) {
        const d = this.driver.deviceFor?.(i) ?? null;
        if (!d || d.kind !== 'pad') continue;
        const present = !!getPad(d.index);
        if (this.padsSeen.has(d.index) && !present) {
          this.padsSeen.delete(d.index);
          if (this.driver.online) toast(`P${i + 1}'s controller disconnected. Plug it back in, bro!`, 'bad', 5000);
          else if (this.hooks.onPause) {
            toast(`P${i + 1}'s controller disconnected. Paused till it's back.`, 'bad', 5000);
            this.togglePause();
            break;
          }
        } else if (present) this.padsSeen.add(d.index);
        if (!this.driver.online && pausePressed(d)) {
          this.togglePause();
          break;
        }
      }
    }
    if (this.paused) {
      // the pause menu covers the match: redraw now and then (a resize clears the canvas), not every frame
      if (now - this.drawnAt > 250) this.paint(now, 0);
      return;
    }
    this.drawDt += dt * this.speed;
    if (this.replay) {
      this.runReplay(dt, now);
      return;
    }
    this.acc += dt * this.speed;
    let n = 0;
    // a step is due a little early (85 %) so frame-time jitter on a 60 Hz screen doesn't skip one frame and double
    // the next; over time it still averages exactly 60 steps a second
    while (this.acc >= STEP * 0.85 && n < 6) {
      this.acc -= STEP;
      n++;
      this.driver.tick((s) => {
        this.r.ingest(s, this.view.tints);
        this.tracker?.step(s);
      });
      const st = this.st;
      if (!st.over) {
        this.hist.push(cloneState(st));
        if (this.hist.length > 100) this.hist.shift();
      }
      if (st.over && !this.sawOver) {
        this.sawOver = true;
        this.startReplay();
        break;
      }
      if (st.over && st.overFrame > 190 && !this.ended) {
        this.ended = true;
        setTimeout(() => {
          this.stop();
          this.tracker?.finish(this.st);
          this.hooks.onEnd(this.st);
        }, 250);
      }
    }
    if (this.acc > STEP * 6) this.acc = 0;
    // draw only when the simulation moved (a 120 Hz screen used to draw every state twice, D22), or now and then while
    // an online match waits for someone
    if (n === 0 && now - this.drawnAt < 100) return;
    this.paint(now, this.drawDt);
    const w = this.driver.waiting?.();
    if (w) {
      const c = this.r.c;
      screenT(c);
      c.fillStyle = 'rgba(0,0,0,0.45)';
      c.fillRect(0, this.r.h * 0.4, this.r.w, this.r.h * 0.16);
      bigText(c, w, this.r.w / 2, this.r.h * 0.48, Math.round(this.r.h * 0.045), '#ffe14f');
    }
  }

  private paint(now: number, dt: number): void {
    this.r.draw(this.st, this.view, dt);
    this.drawDt = 0;
    this.drawnAt = now;
  }

  /** slow-motion zoom on the winning hit */
  private startReplay(): void {
    const st = this.st;
    if (st.cfg.practice || this.hist.length < 20 || st.cfg.goal?.kind === 'survive' || st.cfg.goal?.kind === 'ko') return;
    const victim = st.koOrder[st.koOrder.length - 1] ?? st.fighters.find((f) => f.act === A.DEAD)?.i ?? -1;
    if (victim < 0) return;
    let hitAt = -1;
    for (let i = this.hist.length - 1; i >= 0; i--) {
      const h = this.hist[i];
      const vf = h.fighters[victim];
      if (h.ev.some((e) => e.t === 'hit' && e.p !== victim && Math.abs(e.x - vf.x) < 260 && Math.abs(e.y - vf.y) < 300)) {
        hitAt = i;
        break;
      }
    }
    if (hitAt < 0) return;
    const from = Math.max(0, hitAt - 14);
    const states = this.hist.slice(from, Math.min(this.hist.length, hitAt + 40));
    const vf = this.hist[hitAt].fighters[victim];
    this.replay = { states, i: 0, sub: 0, x: vf.x, y: vf.y - 60, acc: 0 };
    this.r.fx.seen.clear();
    audio.event({ t: 'finalhit', x: 0, y: 0, p: victim }, st);
  }

  /** the replay advances on the 60 Hz clock too (it used to step once per drawn frame) */
  private runReplay(dt: number, now: number): void {
    const rp = this.replay!;
    rp.acc += dt;
    let ticked = false;
    let s = rp.states[rp.i];
    while (rp.acc >= STEP * 0.85 && this.replay) {
      rp.acc -= STEP;
      ticked = true;
      // keep the online session ticking underneath (so nobody stalls waiting for us)
      if (this.driver.online) this.driver.tick(() => {});
      s = rp.states[rp.i];
      this.r.cam.punchX = rp.x;
      this.r.cam.punchY = rp.y;
      this.r.cam.punch = Math.min(0.75, this.r.cam.punch + 0.05);
      if (rp.sub === 0) this.r.ingest(s, this.view.tints);
      rp.sub++;
      const slow = rp.i < 22 ? 4 : 2;
      if (rp.sub >= slow) {
        rp.sub = 0;
        rp.i++;
        if (rp.i >= rp.states.length) {
          this.replay = null;
          this.r.cam.punch = 0;
          this.st.overFrame = 0;
        }
      }
    }
    if (!ticked) return;
    this.r.draw(s, { ...this.view, hideHud: true }, this.drawDt * 0.25);
    this.drawDt = 0;
    this.drawnAt = now;
    const c = this.r.c;
    screenT(c);
    c.fillStyle = 'rgba(120,170,255,0.12)';
    c.fillRect(0, 0, this.r.w, this.r.h);
  }
}

/** convenience for local matches */
export function localMatch(canvas: HTMLCanvasElement, cfg: MatchCfg, devices: (Device | null)[], view: ViewOpts, hooks: MatchHooks): Match {
  return new Match(canvas, new LocalDriver(cfg, devices), view, hooks);
}
