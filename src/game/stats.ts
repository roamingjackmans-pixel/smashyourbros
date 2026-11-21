// What a match adds to the lifetime statistics beyond the sim's own per-fighter counters (D24): the longest combo,
// which moves the local players used, taunts, and how long it ran. A tracker watches the frames and events of one
// match (presentation side, never the sim); rollback re-simulations are skipped by frame number, so each frame
// counts once.
import { A } from '../sim/acts';
import { FIGHTERS } from '../sim/data';
import type { Ev, State } from '../sim/types';

export interface MatchExtra {
  /** the longest combo landed by a local player (hits while the victim never got to act) */
  bestCombo: number;
  /** combos of 3+ hits by local players */
  combos3: number;
  /** move id → times a local player started it */
  moves: Record<string, number>;
  taunts: number;
  /** simulated frames */
  frames: number;
}

/** states where a hit bro can't act: a combo carries on through them */
const STUCK = new Set<number>([A.HITSTUN, A.GRABBED, A.TRAPPED, A.FROZEN, A.DIZZY]);

const extras = new WeakMap<State, MatchExtra>();

/** the extra stats of a finished match (results and recordMatch read them) */
export function matchExtra(st: State): MatchExtra | undefined {
  return extras.get(st);
}

export class MatchTracker {
  private seenFrame = -1;
  private seenEvFrame = -1;
  /** per victim: who is comboing them and how many hits */
  private combo: ({ by: number; n: number } | undefined)[] = [];
  private lastMove: { act: number; mv: number; mf: number }[] = [];
  readonly x: MatchExtra = { bestCombo: 0, combos3: 0, moves: {}, taunts: 0, frames: 0 };

  constructor(private local: number[]) {}

  /** after every simulated frame */
  step(st: State): void {
    if (st.frame <= this.seenFrame) return;
    this.seenFrame = st.frame;
    this.x.frames = st.frame;
    for (const f of st.fighters) {
      const i = f.i;
      // a combo ends once the victim can act again
      const c = this.combo[i];
      if (c && !STUCK.has(f.act) && f.hitlag <= 0) {
        this.endCombo(c);
        this.combo[i] = undefined;
      }
      if (!this.local.includes(i)) continue;
      // a move starting (its frame counter went back, or a different move)
      const prev = this.lastMove[i];
      if (f.act === A.MOVE && (!prev || prev.act !== A.MOVE || prev.mv !== f.mv || f.mf < prev.mf)) {
        const id = FIGHTERS[f.def]?.moveIds[f.mv];
        if (id) this.x.moves[id] = (this.x.moves[id] ?? 0) + 1;
      }
      this.lastMove[i] = { act: f.act, mv: f.mv, mf: f.mf };
    }
  }

  /** every (de-duplicated) event */
  event(e: Ev, st: State): void {
    if (st.frame < this.seenEvFrame) return;
    this.seenEvFrame = st.frame;
    if (e.t === 'taunt' && this.local.includes(e.p)) this.x.taunts++;
    if (e.t !== 'hit' || e.p < 0) return;
    // the bro who got hit: in hitlag, last hit by this attacker
    for (const v of st.fighters) {
      if (v.i === e.p || v.hitlag <= 0 || v.lastHitBy !== e.p) continue;
      const c = this.combo[v.i];
      if (c && c.by === e.p) c.n++;
      else {
        if (c) this.endCombo(c);
        this.combo[v.i] = { by: e.p, n: 1 };
      }
      const cur = this.combo[v.i]!;
      if (this.local.includes(cur.by)) this.x.bestCombo = Math.max(this.x.bestCombo, cur.n);
    }
  }

  private endCombo(c: { by: number; n: number } | undefined): void {
    if (c && c.n >= 3 && this.local.includes(c.by)) this.x.combos3++;
  }

  /** the match is over: keep the result for the results screen */
  finish(st: State): MatchExtra {
    for (const c of this.combo) this.endCombo(c);
    this.combo = [];
    this.x.frames = st.frame;
    extras.set(st, this.x);
    return this.x;
  }
}

/** a readable name for a move id */
export const MOVE_NAMES: Record<string, string> = {
  jab1: 'Jab',
  jab2: 'Jab',
  jab3: 'Jab finisher',
  jab: 'Jab',
  jabR: 'Rapid jab',
  ftilt: 'Forward tilt',
  utilt: 'Up tilt',
  dtilt: 'Down tilt',
  dash: 'Dash attack',
  fsmash: 'Forward smash',
  usmash: 'Up smash',
  dsmash: 'Down smash',
  nair: 'Neutral air',
  fair: 'Forward air',
  bair: 'Back air',
  uair: 'Up air',
  dair: 'Down air',
  nspec: 'Neutral special',
  sspec: 'Side special',
  uspec: 'Up special',
  dspec: 'Down special',
  grab: 'Grab',
  dashgrab: 'Dash grab',
  pummel: 'Pummel',
  fthrow: 'Forward throw',
  bthrow: 'Back throw',
  uthrow: 'Up throw',
  dthrow: 'Down throw',
  ledgeatk: 'Ledge attack',
  getupatk: 'Get-up attack',
  ult: 'Ultimate',
  taunt: 'Taunt',
};

export function moveName(id: string): string {
  return MOVE_NAMES[id] ?? MOVE_NAMES[id.replace(/Air$|2$|Hold$|End$/, '')] ?? id;
}
