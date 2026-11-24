// FlashGames mode, the rules (D27): the day's modifiers, the seeded Classic ladder, each fight's match config and
// the score. Pure (no DOM, no FlashRun global) so tests/flash.test.ts can check it; src/flash/flashMode.ts runs it.
// The modifier list here is the source of public/flash.json (the test fails if the two drift apart).
import { classicRounds, type ClassicRound } from '../data/classic';
import { FIGHTER_INDEX, FIGHTERS, ROSTER } from '../sim/data';
import type { MatchCfg, PlayerCfg, State } from '../sim/types';

export interface FlashModInfo {
  id: string;
  name: string;
  text: string;
  excludes?: string[];
  weight?: number;
}

/** what the run does differently, built from the day's modifier ids */
export interface RunRules {
  /** sim modifiers added to every match (sim/mods.ts) */
  simMods: string[];
  /** item frequency (0 off … 3 high); Classic uses 1 */
  items: number;
  /** simulated seconds per real second */
  speed: number;
  /** one stock each, foes included */
  oneStock: boolean;
  /** every CPU at level 9, every loop */
  hardest: boolean;
  /** every foe (not the host) is a copy of your fighter */
  mirror: boolean;
  /** a new seeded fighter every round */
  shuffle: boolean;
  /** everyone takes triple damage (the camera boss gets a third of its HP to match) */
  triple: boolean;
}

/** a seeded random stream per salt: FlashRun.rng in the game, a copy of it in the tests */
export type Rng = (salt: string) => () => number;

export const BASE_INTENSITY = 3;
/** loop 2 adds this to the intensity, loop 3 twice this (capped at 9) */
export const LOOP_STEP = 3;

/** how each modifier changes the run (ids are stable once live: old days' plans refer to them) */
const EFFECTS: Record<string, (r: RunRules) => void> = {
  moon: (r) => r.simMods.push('lowgrav'),
  bighead: (r) => r.simMods.push('bighead'),
  tiny: (r) => r.simMods.push('tiny'),
  giant: (r) => r.simMods.push('giant'),
  fast: (r) => (r.speed = 1.5),
  triple: (r) => (r.simMods.push('triple'), (r.triple = true)),
  launch: (r) => r.simMods.push('launch'),
  onestock: (r) => (r.oneStock = true),
  monsoon: (r) => (r.simMods.push('itemrain'), (r.items = 3)),
  mirror: (r) => (r.mirror = true),
  shuffle: (r) => (r.shuffle = true),
  hardest: (r) => (r.hardest = true),
  vampire: (r) => r.simMods.push('vampire'),
  noshield: (r) => r.simMods.push('noshield'),
  shrink: (r) => r.simMods.push('shrink'),
  lava: (r) => r.simMods.push('lava'),
};

const MODIFIERS: FlashModInfo[] = [
  { id: 'moon', name: 'Moon Bros', text: 'Moon gravity: floaty jumps, endless recoveries, KOs off the top.' },
  { id: 'bighead', name: 'Big Head Mode', text: 'Every bro’s head is twice the size, and so is the target.' },
  { id: 'tiny', name: 'Pocket Bros', text: 'Everyone is pocket-sized, hits softer and flies much further.', excludes: ['giant'] },
  { id: 'giant', name: 'Protein Shake Night', text: 'Everyone is huge, heavy and hits harder.', excludes: ['tiny'] },
  { id: 'fast', name: 'Fast Forward', text: 'The whole show runs at 1.5× speed.' },
  { id: 'triple', name: 'Glass Jaws', text: 'Everyone takes triple damage from everything.', excludes: ['onestock'] },
  { id: 'launch', name: 'Launch Party', text: 'Double knockback. Every hit is a rocket ride.', excludes: ['onestock'] },
  { id: 'onestock', name: 'One and Done', text: 'One stock each, you and every foe. One fall ends the run.', excludes: ['triple', 'launch', 'hardest'] },
  { id: 'monsoon', name: 'Item Monsoon', text: 'Items pour from the sky, nonstop.' },
  { id: 'mirror', name: 'Mirror, Mirror', text: 'Every contestant is a copy of you. The host refuses.' },
  { id: 'shuffle', name: 'Identity Crisis', text: 'You play a different random bro every round.' },
  { id: 'hardest', name: 'Bro-pocalypse', text: 'Every CPU fights at the hardest level, 9, from round 1.', excludes: ['onestock'] },
  { id: 'vampire', name: 'Second Wind', text: 'Every KO you score heals you back to 0%.' },
  { id: 'noshield', name: 'Shields Down', text: 'Nobody can shield. Rolls and dodges still work.' },
  { id: 'shrink', name: 'Shrinking Studio', text: 'The blast zones close in as each round goes on.' },
  { id: 'lava', name: 'The Floor Is Lava', text: 'Lava rises over the stage every 22 seconds.' },
];

/** points (all multiplied by the loop number) */
export const POINTS = {
  /** each round won */
  win: 1000,
  /** each of your stocks left when you win it */
  stock: 250,
  /** each whole second under PAR from GO to the winning KO */
  second: 10,
  par: 120,
  /** beating Max Ratings (round 8) and The Big BROadcast (the camera) */
  max: 2000,
  broadcast: 3000,
  /** each KO you score, and each stagehand you KO */
  ko: 100,
  grunt: 25,
};

/** public/flash.json (FlashRun protocol v1) */
export const FLASH_INFO = {
  v: 1,
  id: 'smashyourbros',
  name: 'Smash Your Bros',
  tagline: 'A bromance platform fighter: knock your bros off the stage.',
  goal: 'Climb the Classic ladder against CPU bros: 8 rounds, then the host’s camera. Lose a round and the run ends; beat the host and a harder loop begins.',
  scoring:
    'Each round won: 1,000, +250 per stock left, +10 per second under 2:00. Beating Max Ratings +2,000, The Big BROadcast +3,000. Each KO 100 (stagehands 25). Loop 2 doubles all of it, loop 3 triples it, and so on.',
  maxScore: 2000000,
  pick: [2, 3],
  modifiers: MODIFIERS,
};

export function runRules(mods: readonly string[]): RunRules {
  const r: RunRules = { simMods: [], items: 1, speed: 1, oneStock: false, hardest: false, mirror: false, shuffle: false, triple: false };
  for (const id of mods) EFFECTS[id]?.(r);
  return r;
}

/** is this modifier id one the game knows */
export function knownMod(id: string): boolean {
  return id in EFFECTS;
}

export function intensityFor(rules: RunRules, loop: number): number {
  if (rules.hardest) return 9;
  return Math.min(9, BASE_INTENSITY + LOOP_STEP * (loop - 1));
}

const pickFighter = (r: number): string => ROSTER[Math.min(ROSTER.length - 1, Math.floor(r * ROSTER.length))].def.id;

/** the run's fighter: FlashRun.rng('fighter') */
export function baseFighter(rng: Rng): string {
  return pickFighter(rng('fighter')());
}

/** who you play in a fight (Identity Crisis: a new one each round, the same for everyone) */
export function fighterFor(rules: RunRules, rng: Rng, loop: number, at: number): string {
  if (!rules.shuffle || (loop === 1 && at === 0)) return baseFighter(rng);
  return pickFighter(rng(`fighter:${loop}:${at}`)());
}

/** each loop's ladder: Classic's eight rounds, foes and stages from the day's seed */
export function ladderFor(rng: Rng, loop: number): ClassicRound[] {
  const seed = Math.floor(rng(`ladder:${loop}`)() * 4294967296) >>> 0;
  return classicRounds(baseFighter(rng), seed);
}

/** a place in the run: loop (1, 2, …), round (0-7; 7 is Max Ratings) and the camera phase after round 7 */
export interface Fight {
  loop: number;
  at: number;
  boss: boolean;
}

export type FightKind = 'round' | 'max' | 'broadcast';

export const FIRST_FIGHT: Fight = { loop: 1, at: 0, boss: false };
export const ROUNDS = 8;

export function fightKind(f: Fight): FightKind {
  if (f.at === ROUNDS - 1) return f.boss ? 'broadcast' : 'max';
  return 'round';
}

export function nextFight(f: Fight): Fight {
  if (f.at === ROUNDS - 1 && !f.boss) return { loop: f.loop, at: f.at, boss: true };
  if (f.at === ROUNDS - 1) return { loop: f.loop + 1, at: 0, boss: false };
  return { loop: f.loop, at: f.at + 1, boss: false };
}

export interface FightSetup {
  cfg: MatchCfg;
  kind: FightKind;
  fighter: string;
  title: string;
  objective: string;
  intensity: number;
}

/** one fight's match, built the way Classic builds it (ui/classicUi.ts playRound) plus the day's modifiers */
export function fightSetup(rules: RunRules, rng: Rng, fight: Fight): FightSetup {
  const rounds = ladderFor(rng, fight.loop);
  const r = rounds[fight.at];
  const kind = fightKind(fight);
  const intensity = intensityFor(rules, fight.loop);
  const cpu = Math.min(9, Math.max(1, intensity + (fight.at >= 6 ? 1 : 0)));
  const me = fighterFor(rules, rng, fight.loop, fight.at);
  const base = baseFighter(rng);
  const stocks = rules.oneStock ? 1 : r.stocks;
  const players: PlayerCfg[] = [{ fighter: me, color: 0, team: 0, cpu: 0, name: 'You', tapJump: false }];
  if (kind === 'broadcast') {
    players.push({ fighter: 'max', color: 0, team: 1, cpu: 1, name: 'The Big BROadcast', tapJump: false, boss: 'broadcast', hpMult: (0.6 + intensity * 0.1) / (rules.triple ? 3 : 1) });
    players.push({ fighter: 'stagehand', color: 0, team: 1, cpu: Math.max(2, cpu - 2), name: 'Stagehand', tapJump: false, grunt: true });
  } else {
    for (const f of r.foes) {
      // the ladder's mirror round mirrors whoever you are this round; Mirror, Mirror makes every contestant you
      const id = f.fighter === base || (rules.mirror && !f.boss) ? me : f.fighter;
      const color = id === me ? players.length : (fight.at + players.length) % 8;
      players.push({ fighter: id, color, team: f.ally ? 0 : 1, cpu: f.ally ? Math.min(9, cpu + 1) : cpu, name: FIGHTERS[FIGHTER_INDEX[id]].def.name, tapJump: false, giant: f.giant, hpMult: f.giant ? 1.5 : 1, armor: f.boss ? 4 : undefined });
    }
  }
  const grunts = players.filter((p) => p.grunt);
  const cfg: MatchCfg = {
    seed: Math.floor(rng(`match:${fight.loop}:${fight.at}:${fight.boss ? 1 : 0}`)() * 2147483648),
    stage: r.stage,
    mode: 'stock',
    stocks,
    time: 0,
    hp: 150,
    items: rules.items,
    ult: 'meter',
    mods: [...(r.mods ?? []), ...rules.simMods],
    teams: true,
    friendlyFire: false,
    players,
    goal: kind === 'broadcast' ? { kind: 'boss', waves: Array.from({ length: 60 }, () => grunts) } : undefined,
  };
  const title = kind === 'broadcast' ? 'Encore: The Big BROadcast' : r.title;
  const head = kind === 'broadcast' ? 'THE BIG BRO-ADCAST!' : kind === 'max' ? 'MAX RATINGS!' : r.title.toUpperCase();
  return { cfg, kind, fighter: me, title, objective: fight.loop > 1 ? `LOOP ${fight.loop}: ${head}` : head, intensity };
}

/** did you (team 0) win a finished match */
export function fightWon(st: State): boolean {
  if (!st.over) return false;
  return st.cfg.goal ? st.winner.length > 0 : st.winner.some((w) => st.cfg.players[w]?.team === 0);
}

/** the KOs slot 0 scored this frame (the sim's own rule for who gets a KO: sim.ts ko()) */
export function playerKos(st: State, slot = 0): { grunt: boolean }[] {
  const out: { grunt: boolean }[] = [];
  for (const e of st.ev) {
    if (e.t !== 'ko' || e.p === slot) continue;
    const v = st.fighters[e.p];
    if (v && v.lastHitBy === slot && v.lastHitT < 480) out.push({ grunt: !!st.cfg.players[e.p]?.grunt });
  }
  return out;
}

export function koPoints(loop: number, grunt: boolean): number {
  return (grunt ? POINTS.grunt : POINTS.ko) * loop;
}

/** a won fight's points: stocks left and the simulated frames from GO to the end */
export function roundPoints(kind: FightKind, loop: number, stocksLeft: number, frames: number): { total: number; speed: number } {
  const speed = Math.max(0, Math.floor((POINTS.par * 60 - frames) / 60)) * POINTS.second;
  const host = kind === 'max' ? POINTS.max : kind === 'broadcast' ? POINTS.broadcast : 0;
  const base = POINTS.win + POINTS.stock * Math.max(0, stocksLeft) + speed + host;
  return { total: base * loop, speed: speed * loop };
}

/** the run's score: only ever adds */
export class FlashScore {
  total = 0;
  kos = 0;
  won = 0;
  loop = 1;

  ko(loop: number, grunt: boolean): number {
    const p = koPoints(loop, grunt);
    this.total += p;
    this.kos++;
    return p;
  }

  round(kind: FightKind, loop: number, stocksLeft: number, frames: number): number {
    const p = roundPoints(kind, loop, stocksLeft, frames).total;
    this.total += p;
    this.won++;
    return p;
  }

  /** the short line FlashGames shows beside the score */
  detail(): string {
    return `Loop ${this.loop} · ${this.won} round${this.won === 1 ? '' : 's'} won · ${this.kos} KO${this.kos === 1 ? '' : 's'}`;
  }
}
