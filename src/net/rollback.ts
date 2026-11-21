// Rollback netcode for up to four players. Everyone runs the same deterministic simulation; only inputs travel.
// Local inputs are delayed a couple of frames; missing remote inputs are predicted (their last input repeats);
// when a real input arrives that differs from the prediction, the state rolls back to that frame and replays.
// CPU slots need no inputs (bots run inside the simulation). Time sync nudges whoever runs ahead to wait.
import { NEUTRAL } from '../sim/input';
import { checksum, cloneState, step } from '../sim/sim';
import type { State } from '../sim/types';

export interface Packet {
  /** slot */
  s: number;
  /** first frame of i */
  f: number;
  i: number[];
  /** sender's current frame */
  cf: number;
  /** sender's frame advantage over each slot */
  adv?: Record<number, number>;
  /** desync check: [frame, hash] */
  cs?: [number, number];
}

export const MAX_PRED = 10;
const KEEP = 40;

export class Session {
  st: State;
  /** inputs[slot] : frame -> input (local and confirmed remote) */
  private inputs: Map<number, number>[];
  /** what we fed the simulation for remote slots: frame -> input */
  private used: Map<number, number>[];
  private snaps = new Map<number, State>();
  /** highest frame with every input confirmed, per slot */
  last: number[];
  private rollbackFrom = Infinity;
  remoteCf: number[];
  remoteAdv: number[];
  delay: number;
  checks = new Map<number, number>();
  desyncs = 0;
  onDesync: ((frame: number) => void) | null = null;
  /** frames to wait (time sync) */
  private waitFrames = 0;
  rollbacks = 0;

  constructor(
    st: State,
    public local: number,
    /** slots that need inputs from the network (humans elsewhere) */
    public remote: number[],
    delay = 2,
  ) {
    this.st = st;
    const n = st.fighters.length;
    this.inputs = Array.from({ length: n }, () => new Map());
    this.used = Array.from({ length: n }, () => new Map());
    this.last = Array.from({ length: n }, () => -1);
    this.remoteCf = Array.from({ length: n }, () => 0);
    this.remoteAdv = Array.from({ length: n }, () => 0);
    this.delay = delay;
    // the first `delay` frames have no local input yet
    for (let f = 0; f <= delay; f++) this.inputs[local].set(f, NEUTRAL);
    this.last[local] = delay;
  }

  get frame(): number {
    return this.st.frame;
  }

  /** this machine's input for (frame + delay) */
  addLocal(input: number): void {
    const fr = this.frame + this.delay + 1;
    if (!this.inputs[this.local].has(fr)) {
      this.inputs[this.local].set(fr, input);
      this.last[this.local] = fr;
    }
  }

  /** a packet for the others: our inputs from `from` to the newest */
  packet(from: number): Packet {
    const i: number[] = [];
    const start = Math.max(0, from);
    for (let f = start; f <= this.last[this.local]; f++) i.push(this.inputs[this.local].get(f) ?? NEUTRAL);
    const adv: Record<number, number> = {};
    for (const s of this.remote) adv[s] = this.frame - this.remoteCf[s];
    const p: Packet = { s: this.local, f: start, i, cf: this.frame, adv };
    return p;
  }

  receive(p: Packet): void {
    const s = p.s;
    if (s === this.local || !this.inputs[s]) return;
    this.remoteCf[s] = Math.max(this.remoteCf[s], p.cf);
    if (p.adv && p.adv[this.local] !== undefined) this.remoteAdv[s] = p.adv[this.local];
    for (let k = 0; k < p.i.length; k++) {
      const fr = p.f + k;
      if (this.inputs[s].has(fr)) continue;
      const v = p.i[k];
      this.inputs[s].set(fr, v);
      const u = this.used[s].get(fr);
      if (u !== undefined && u !== v) this.rollbackFrom = Math.min(this.rollbackFrom, fr);
    }
    // advance the contiguous confirmed frontier
    let l = this.last[s];
    while (this.inputs[s].has(l + 1)) l++;
    this.last[s] = l;
    if (p.cs) this.compare(p.cs[0], p.cs[1]);
  }

  private inputFor(slot: number, fr: number): number {
    const m = this.inputs[slot];
    const v = m.get(fr);
    if (v !== undefined) return v;
    // predict: repeat the newest known input
    return m.get(this.last[slot]) ?? NEUTRAL;
  }

  /** the oldest frame any remote slot hasn't confirmed */
  minConfirmed(): number {
    let m = Infinity;
    for (const s of this.remote) m = Math.min(m, this.last[s]);
    return m === Infinity ? this.frame : m;
  }

  /** whether we are too far ahead of someone to keep predicting */
  stalled(): boolean {
    for (const s of this.remote) if (this.frame - this.last[s] > MAX_PRED) return true;
    return false;
  }

  /** slots we're waiting on (for the "waiting for…" banner) */
  waitingOn(): number[] {
    return this.remote.filter((s) => this.frame - this.last[s] > MAX_PRED);
  }

  private stepOne(onStep?: (st: State) => void): void {
    const fr = this.frame;
    this.snaps.set(fr, cloneState(this.st));
    const n = this.st.fighters.length;
    const ins: number[] = new Array(n);
    for (let s = 0; s < n; s++) {
      if (s === this.local) ins[s] = this.inputs[s].get(fr) ?? NEUTRAL;
      else if (this.remote.includes(s)) {
        ins[s] = this.inputFor(s, fr);
        this.used[s].set(fr, ins[s]);
      } else ins[s] = NEUTRAL;
    }
    step(this.st, ins);
    onStep?.(this.st);
    this.snaps.delete(fr - KEEP);
    for (const s of this.remote) this.used[s].delete(fr - KEEP);
  }

  /** run one frame (rolling back first if needed). Returns false when stalled. */
  advance(onStep?: (st: State) => void): boolean {
    if (this.rollbackFrom < this.frame) {
      const snap = this.snaps.get(this.rollbackFrom);
      if (snap) {
        const target = this.frame;
        this.st = cloneState(snap);
        this.rollbacks++;
        while (this.frame < target) this.stepOne(onStep);
      }
    }
    this.rollbackFrom = Infinity;
    // time sync: if we're running ahead of a peer, wait a frame now and then
    if (this.waitFrames > 0) {
      this.waitFrames--;
      return true;
    }
    if (this.frame % 30 === 0) {
      let ahead = 0;
      for (const s of this.remote) ahead = Math.max(ahead, (this.frame - this.remoteCf[s] - this.remoteAdv[s]) / 2);
      if (ahead >= 1.5) this.waitFrames = Math.min(4, Math.floor(ahead));
    }
    if (this.stalled()) return false;
    this.stepOne(onStep);
    // prune confirmed inputs we'll never need again
    const old = this.minConfirmed() - KEEP * 2;
    if (this.frame % 60 === 0) for (const m of this.inputs) for (const k of m.keys()) if (k < old) m.delete(k);
    return true;
  }

  /** a checksum of a fully confirmed frame to share (every 120 frames) */
  checkPoint(): [number, number] | undefined {
    const conf = Math.min(this.minConfirmed(), this.last[this.local]);
    const k = Math.floor(conf / 120) * 120;
    if (k <= 0 || this.checks.has(-k)) return undefined;
    const snap = this.snaps.get(k);
    if (!snap) return undefined;
    const h = checksum(snap);
    this.checks.set(-k, h);
    this.checks.set(k, h);
    return [k, h];
  }

  private compare(frame: number, h: number): void {
    const mine = this.checks.get(frame);
    if (mine === undefined) {
      const snap = this.snaps.get(frame);
      if (snap) {
        const hh = checksum(snap);
        this.checks.set(frame, hh);
        if (hh !== h) this.mismatch(frame);
      }
      return;
    }
    if (mine !== h) this.mismatch(frame);
  }

  private mismatch(frame: number): void {
    this.desyncs++;
    this.onDesync?.(frame);
  }

  /** the host's state for a frame (desync repair): adopt it and replay from there */
  adopt(frame: number, state: State): void {
    if (frame > this.frame) return;
    this.snaps.set(frame, state);
    this.rollbackFrom = Math.min(this.rollbackFrom, frame);
  }

  snapshot(frame: number): State | undefined {
    return this.snaps.get(frame);
  }

  /** a disconnected player becomes a CPU from `frame` on (everyone applies the same change) */
  toCpu(slot: number, frame: number, level: number): void {
    this.remote = this.remote.filter((s) => s !== slot);
    const apply = (st: State): void => {
      st.fighters[slot].cpu = level;
      st.cfg.players[slot] = { ...st.cfg.players[slot], cpu: level };
    };
    for (const [fr, snap] of this.snaps) if (fr >= frame) apply(snap);
    const snap = this.snaps.get(frame);
    if (snap) {
      this.rollbackFrom = Math.min(this.rollbackFrom, frame);
    } else apply(this.st);
  }
}
