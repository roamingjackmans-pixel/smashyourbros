// Running a match on this machine: the fixed 60 Hz loop, local devices, the slow-motion replay of the winning hit,
// pause. Online matches use the same renderer through net/session.ts (rollback) instead of this loop.
import { A } from '../sim/acts';
import { NEUTRAL } from '../sim/input';
import { cloneState, initState, step } from '../sim/sim';
import type { MatchCfg, State } from '../sim/types';
import { Renderer, type ViewOpts } from '../render/renderer';
import { readDevice, type Device } from './input';
import { audio } from '../audio/audio';

export interface MatchHooks {
  onEnd: (st: State) => void;
  onPause?: (resume: () => void, quit: () => void) => void;
}

const STEP = 1 / 60;

export class LocalMatch {
  st: State;
  r: Renderer;
  private raf = 0;
  private acc = 0;
  private last = 0;
  private hist: State[] = [];
  private replay: { states: State[]; i: number; sub: number; x: number; y: number } | null = null;
  private ended = false;
  private paused = false;
  stopped = false;

  constructor(
    canvas: HTMLCanvasElement,
    public cfg: MatchCfg,
    public devices: (Device | null)[],
    public view: ViewOpts,
    public hooks: MatchHooks,
  ) {
    this.st = initState(cfg);
    this.r = new Renderer(canvas);
    this.r.fx.onEvent = (e, st) => audio.event(e, st);
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
    audio.stopMusic();
  }

  private onKey = (e: KeyboardEvent): void => {
    if (e.code === 'Escape' || e.code === 'Enter') {
      if (this.st.over || this.replay) return;
      this.togglePause();
    }
    if (e.code === 'KeyH' && e.ctrlKey) this.view.boxes = !this.view.boxes;
  };

  private togglePause(): void {
    if (this.paused) return;
    this.paused = true;
    this.hooks.onPause?.(
      () => {
        this.paused = false;
        this.last = performance.now();
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
    // gamepad Start pauses
    const pads = navigator.getGamepads ? navigator.getGamepads() : [];
    let start = false;
    for (const g of pads) if (g?.buttons[9]?.pressed) start = true;
    if (start && !this.padStartWasDown && !this.st.over) this.togglePause();
    this.padStartWasDown = start;
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
    while (this.acc >= STEP && n < 5) {
      this.acc -= STEP;
      n++;
      const inputs = this.devices.map((d) => (d ? readDevice(d) : NEUTRAL));
      const wasOver = this.st.over;
      step(this.st, inputs);
      this.r.ingest(this.st, this.view.tints);
      if (!this.st.over) {
        this.hist.push(cloneState(this.st));
        if (this.hist.length > 100) this.hist.shift();
      }
      if (this.st.over && !wasOver) {
        this.startReplay();
        break;
      }
      if (this.st.over && this.st.overFrame > 190 && !this.ended) {
        this.ended = true;
        setTimeout(() => {
          this.stop();
          this.hooks.onEnd(this.st);
        }, 300);
      }
    }
    if (this.acc > STEP * 5) this.acc = 0;
    this.r.draw(this.st, this.view, dt);
  }

  /** slow-motion zoom on the winning hit */
  private startReplay(): void {
    const st = this.st;
    if (st.cfg.practice || this.hist.length < 20 || st.cfg.goal?.kind === 'survive') return;
    // the fighter who went out last
    const victim = st.koOrder[st.koOrder.length - 1] ?? st.fighters.find((f) => f.act === A.DEAD)?.i ?? -1;
    if (victim < 0) return;
    // find the last hit on them in the history
    let hitAt = -1;
    for (let i = this.hist.length - 1; i >= 0; i--) {
      if (this.hist[i].ev.some((e) => e.t === 'hit' && e.p !== victim && Math.abs(e.x - this.hist[i].fighters[victim].x) < 260)) {
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
    this.r.cam.punchX = rp.x;
    this.r.cam.punchY = rp.y;
    this.r.cam.punch = Math.min(0.75, this.r.cam.punch + 0.05);
    if (rp.sub === 0) this.r.ingest(s, this.view.tints);
    this.r.draw(s, { ...this.view, hideHud: true }, dt * 0.25);
    // blue-white tint while slowed
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
