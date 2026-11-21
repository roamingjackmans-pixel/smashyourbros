// Running a match: the fixed 60 Hz loop, the slow-motion replay of the winning hit, pause, the "waiting for…"
// banner online. Where the frames come from is a Driver: LocalDriver steps the simulation with this machine's
// devices; OnlineDriver (net/online.ts) runs the rollback session.
import { A } from '../sim/acts';
import { NEUTRAL } from '../sim/input';
import { cloneState, initState, step } from '../sim/sim';
import type { MatchCfg, State } from '../sim/types';
import { bigText } from '../render/hud';
import { Renderer, type ViewOpts } from '../render/renderer';
import { readDevice, type Device } from './input';
import { audio } from '../audio/audio';

export interface Driver {
  readonly online: boolean;
  state(): State;
  /** one 60 Hz tick; call onStep after every simulated frame (including replays after a rollback) */
  tick(onStep: (st: State) => void): void;
  /** text for a banner while stalled (online) */
  waiting?(): string | null;
  stop?(): void;
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
  tick(onStep: (st: State) => void): void {
    const inputs = this.devices.map((d) => (d ? readDevice(d) : NEUTRAL));
    step(this.st, inputs);
    onStep(this.st);
  }
}

export interface MatchHooks {
  onEnd: (st: State) => void;
  onPause?: (resume: () => void, quit: () => void) => void;
}

const STEP = 1 / 60;

export class Match {
  r: Renderer;
  private raf = 0;
  private acc = 0;
  private last = 0;
  private hist: State[] = [];
  private replay: { states: State[]; i: number; sub: number; x: number; y: number } | null = null;
  private ended = false;
  private paused = false;
  private sawOver = false;
  stopped = false;

  constructor(
    canvas: HTMLCanvasElement,
    public driver: Driver,
    public view: ViewOpts,
    public hooks: MatchHooks,
  ) {
    this.r = new Renderer(canvas);
    this.r.fx.onEvent = (e, st) => audio.event(e, st);
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
        this.hooks.onEnd(this.st);
      },
    );
  }

  private padStartWasDown = false;
  private frame(now: number): void {
    const dt = Math.min(0.1, (now - this.last) / 1000);
    this.last = now;
    if (!this.driver.online) {
      const pads = navigator.getGamepads ? navigator.getGamepads() : [];
      let start = false;
      for (const g of pads) if (g?.buttons[9]?.pressed) start = true;
      if (start && !this.padStartWasDown && !this.st.over) this.togglePause();
      this.padStartWasDown = start;
    }
    if (this.paused) {
      this.r.draw(this.st, this.view, 0);
      return;
    }
    if (this.replay) {
      this.runReplay(dt);
      return;
    }
    this.acc += dt;
    let n = 0;
    while (this.acc >= STEP && n < 6) {
      this.acc -= STEP;
      n++;
      this.driver.tick((s) => this.r.ingest(s, this.view.tints));
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
          this.hooks.onEnd(this.st);
        }, 250);
      }
    }
    if (this.acc > STEP * 6) this.acc = 0;
    this.r.draw(this.st, this.view, dt);
    const w = this.driver.waiting?.();
    if (w) {
      const c = this.r.c;
      c.setTransform(1, 0, 0, 1, 0, 0);
      c.fillStyle = 'rgba(0,0,0,0.45)';
      c.fillRect(0, this.r.h * 0.4, this.r.w, this.r.h * 0.16);
      bigText(c, w, this.r.w / 2, this.r.h * 0.48, Math.round(this.r.h * 0.045), '#ffe14f');
    }
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
    this.replay = { states, i: 0, sub: 0, x: vf.x, y: vf.y - 60 };
    this.r.fx.seen.clear();
    audio.event({ t: 'finalhit', x: 0, y: 0, p: victim }, st);
  }

  private runReplay(dt: number): void {
    const rp = this.replay!;
    const s = rp.states[rp.i];
    // keep the online session ticking underneath (so nobody stalls waiting for us)
    if (this.driver.online) this.driver.tick(() => {});
    this.r.cam.punchX = rp.x;
    this.r.cam.punchY = rp.y;
    this.r.cam.punch = Math.min(0.75, this.r.cam.punch + 0.05);
    if (rp.sub === 0) this.r.ingest(s, this.view.tints);
    this.r.draw(s, { ...this.view, hideHud: true }, dt * 0.25);
    const c = this.r.c;
    c.setTransform(1, 0, 0, 1, 0, 0);
    c.fillStyle = 'rgba(120,170,255,0.12)';
    c.fillRect(0, 0, this.r.w, this.r.h);
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
}

/** convenience for local matches */
export function localMatch(canvas: HTMLCanvasElement, cfg: MatchCfg, devices: (Device | null)[], view: ViewOpts, hooks: MatchHooks): Match {
  return new Match(canvas, new LocalDriver(cfg, devices), view, hooks);
}
