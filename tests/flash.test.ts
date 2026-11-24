// FlashGames mode (D27): public/flash.json, the seeded ladder, every modifier doing what it says (alone and in every
// allowed combination of 2-3), and a score that never goes down.
//   WRITE_FLASH_JSON=1 npx vitest run tests/flash.test.ts   rewrites public/flash.json from src/flash/rules.ts
import { readFileSync, writeFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import '../src/flash/flash-run.js';
import { A } from '../src/sim/acts';
import { BIG_HEAD, fighterScale, fighterSkel } from '../src/sim/anim';
import { applyHit, hurtCapsules } from '../src/sim/combat';
import { FIGHTERS, ROSTER } from '../src/sim/data';
import { B_SHIELD, NEUTRAL, pack } from '../src/sim/input';
import { initState, step } from '../src/sim/sim';
import type { MatchCfg, State } from '../src/sim/types';
import {
  BASE_INTENSITY,
  FIRST_FIGHT,
  FLASH_INFO,
  FlashScore,
  baseFighter,
  fightSetup,
  fightWon,
  intensityFor,
  knownMod,
  koPoints,
  ladderFor,
  nextFight,
  playerKos,
  roundPoints,
  runRules,
  type Fight,
  type Rng,
} from '../src/flash/rules';

const JSON_PATH = new URL('../public/flash.json', import.meta.url);

/** the SDK's seeded streams (sdk/flash-run.js: mulberry32 over seed ^ FNV-1a(salt)) for any seed */
function sdkRng(seed: number): Rng {
  return (salt) => {
    let h = 2166136261 >>> 0;
    for (let i = 0; i < salt.length; i++) h = Math.imul(h ^ salt.charCodeAt(i), 16777619) >>> 0;
    let a = ((seed >>> 0) ^ h) >>> 0;
    return () => {
      a = (a + 0x6d2b79f5) >>> 0;
      let t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  };
}

const IDS = FLASH_INFO.modifiers.map((m) => m.id);
const excluded = (a: string, b: string): boolean => {
  const ma = FLASH_INFO.modifiers.find((m) => m.id === a);
  const mb = FLASH_INFO.modifiers.find((m) => m.id === b);
  return !!(ma?.excludes?.includes(b) || mb?.excludes?.includes(a));
};

/** every allowed day: each modifier alone, and every combination of 2 and 3 with no excluded pair */
function allowedSets(): string[][] {
  const out: string[][] = IDS.map((id) => [id]);
  for (let i = 0; i < IDS.length; i++)
    for (let j = i + 1; j < IDS.length; j++) {
      if (excluded(IDS[i], IDS[j])) continue;
      out.push([IDS[i], IDS[j]]);
      for (let k = j + 1; k < IDS.length; k++) if (!excluded(IDS[i], IDS[k]) && !excluded(IDS[j], IDS[k])) out.push([IDS[i], IDS[j], IDS[k]]);
    }
  return out;
}

/** the nine fights of a loop */
function loopFights(loop: number): Fight[] {
  const out: Fight[] = [];
  let f: Fight = { loop, at: 0, boss: false };
  while (f.loop === loop) {
    out.push(f);
    f = nextFight(f);
  }
  return out;
}

/** a fight's match with the player's slot driven by a CPU (so the run plays itself) */
function botCfg(cfg: MatchCfg, level = 9): MatchCfg {
  const c = structuredClone(cfg);
  c.players[0].cpu = level;
  return c;
}

function run(st: State, frames: number, inputs?: (st: State) => number[]): void {
  for (let i = 0; i < frames && !st.over; i++) step(st, inputs ? inputs(st) : st.cfg.players.map(() => NEUTRAL));
}

/** a plain 1v1 for the sim-level checks, past the countdown */
function duel(mods: string[], extra: Partial<MatchCfg> = {}): State {
  const st = initState({
    seed: 5,
    stage: 'studio',
    mode: 'stock',
    stocks: 2,
    time: 0,
    hp: 150,
    items: 0,
    ult: 'off',
    mods,
    teams: false,
    friendlyFire: false,
    players: [
      { fighter: 'kit', color: 0, team: 0, cpu: 0, name: 'You', tapJump: false },
      { fighter: 'clank', color: 1, team: 1, cpu: 0, name: 'Foe', tapJump: false },
    ],
    ...extra,
  });
  st.intro = 0;
  return st;
}

const HIT = { dmg: 10, ang: 45, bkb: 40, kbg: 60 };
const OPTS = { sx: 0, sy: 0, facing: 1, dmgMult: 1, kbMult: 1, proj: true, moveIdx: -1, shielded: false };

describe('flash.json', () => {
  it('is public/flash.json, the protocol v1 shape, every id known to the game', () => {
    const text = `${JSON.stringify(FLASH_INFO, null, 2)}\n`;
    if (process.env.WRITE_FLASH_JSON) writeFileSync(JSON_PATH, text);
    expect(JSON.parse(readFileSync(JSON_PATH, 'utf8'))).toEqual(FLASH_INFO);
    expect(FLASH_INFO.v).toBe(1);
    expect(FLASH_INFO.id).toBe('smashyourbros');
    for (const k of ['name', 'tagline', 'goal', 'scoring'] as const) expect(FLASH_INFO[k].length).toBeGreaterThan(5);
    expect(FLASH_INFO.maxScore).toBeGreaterThan(0);
    const [lo, hi] = FLASH_INFO.pick;
    expect(lo).toBeGreaterThanOrEqual(1);
    expect(hi).toBeGreaterThanOrEqual(lo);
    expect(IDS.length).toBeGreaterThanOrEqual(12);
    expect(IDS.length).toBeLessThanOrEqual(16);
    expect(new Set(IDS).size).toBe(IDS.length);
    for (const m of FLASH_INFO.modifiers) {
      expect(knownMod(m.id), m.id).toBe(true);
      expect(m.id).toMatch(/^[a-z0-9]+$/);
      expect(m.name.length).toBeGreaterThan(2);
      expect(m.text.length).toBeGreaterThan(10);
      // excludes name real modifiers, both ways round
      for (const x of m.excludes ?? []) {
        expect(IDS, `${m.id} excludes ${x}`).toContain(x);
        expect(FLASH_INFO.modifiers.find((o) => o.id === x)?.excludes ?? [], `${x} should exclude ${m.id} too`).toContain(m.id);
      }
    }
    // a day of `hi` modifiers can always be made
    expect(allowedSets().some((s) => s.length === hi)).toBe(true);
  });

  it('the scoring text matches the points table', () => {
    // a round won in 30 s with 2 stocks left, loop 1: 1,000 + 500 + 10 × 90
    expect(roundPoints('round', 1, 2, 30 * 60).total).toBe(2400);
    expect(roundPoints('max', 1, 0, 200 * 60).total).toBe(3000);
    expect(roundPoints('broadcast', 2, 1, 120 * 60).total).toBe((1000 + 250 + 3000) * 2);
    expect(koPoints(1, false)).toBe(100);
    expect(koPoints(3, true)).toBe(75);
    expect(FLASH_INFO.scoring).toContain('1,000');
    expect(FLASH_INFO.scoring).toContain('+250 per stock');
    expect(FLASH_INFO.scoring).toContain('+10 per second under 2:00');
  });
});

describe('the seeded run', () => {
  it('our copy of the SDK streams is the SDK (seed 0 outside a run)', () => {
    expect(globalThis.FlashRun.active).toBe(false);
    for (const salt of ['fighter', 'ladder:1', 'match:1:3:0']) {
      const a = globalThis.FlashRun.rng(salt);
      const b = sdkRng(0)(salt);
      for (let i = 0; i < 5; i++) expect(a()).toBe(b());
    }
  });

  it('the same seed gives everyone the same fighter, ladder and matches', () => {
    for (const seed of [1, 12345, 987654321]) {
      const a = sdkRng(seed);
      const b = sdkRng(seed);
      const rules = runRules([]);
      expect(baseFighter(a)).toBe(baseFighter(b));
      expect(ladderFor(a, 1)).toEqual(ladderFor(b, 1));
      for (const f of loopFights(1)) expect(fightSetup(rules, a, f).cfg).toEqual(fightSetup(rules, b, f).cfg);
    }
    // and seeds differ
    const fighters = new Set(Array.from({ length: 40 }, (_, i) => baseFighter(sdkRng(i * 7919))));
    expect(fighters.size).toBeGreaterThan(5);
    const ladders = new Set(Array.from({ length: 10 }, (_, i) => JSON.stringify(ladderFor(sdkRng(i + 1), 1).map((r) => [r.stage, r.foes]))));
    expect(ladders.size).toBeGreaterThan(5);
  });

  it('builds Classic: eight rounds, then the camera, then a harder loop', () => {
    const rng = sdkRng(4242);
    const rules = runRules([]);
    const fights = loopFights(1);
    expect(fights.length).toBe(9);
    expect(nextFight(fights[8])).toEqual({ loop: 2, at: 0, boss: false });
    const me = baseFighter(rng);
    const setups = fights.map((f) => fightSetup(rules, rng, f));
    expect(setups.map((s) => s.kind)).toEqual(['round', 'round', 'round', 'round', 'round', 'round', 'round', 'max', 'broadcast']);
    for (const s of setups) {
      expect(s.cfg.players[0]).toMatchObject({ fighter: me, cpu: 0, team: 0 });
      expect(s.cfg.items).toBe(1);
      for (const p of s.cfg.players.slice(1)) if (!p.boss && !p.grunt) expect(p.cpu).toBeGreaterThanOrEqual(BASE_INTENSITY);
    }
    // round 3 has an ally, round 6 is a mirror of you, round 8 is Max, then the camera boss with its stagehands
    expect(setups[2].cfg.players.filter((p) => p.team === 0).length).toBe(2);
    expect(setups[5].cfg.players[1].fighter).toBe(me);
    expect(setups[7].cfg.players[1].fighter).toBe('max');
    expect(setups[8].cfg.players.some((p) => p.boss === 'broadcast')).toBe(true);
    expect(setups[8].cfg.goal?.kind).toBe('boss');
    // loop 2: new seeded ladder, tougher CPUs
    expect(intensityFor(rules, 2)).toBeGreaterThan(intensityFor(rules, 1));
    expect(intensityFor(rules, 5)).toBe(9);
    const l2 = fightSetup(rules, rng, { loop: 2, at: 0, boss: false });
    expect(l2.cfg.players[1].cpu).toBe(intensityFor(rules, 2));
    expect(l2.objective).toContain('LOOP 2');
  });

  it('only the player slot is human and the match never reads a profile', () => {
    for (const f of loopFights(1)) {
      const s = fightSetup(runRules([]), sdkRng(77), f);
      expect(s.cfg.players.filter((p) => p.cpu === 0).length).toBe(1);
      expect(s.cfg.practice).toBeUndefined();
    }
  });
});

describe('each modifier does what it says', () => {
  const rng = sdkRng(31337);
  const setups = (mods: string[]): ReturnType<typeof fightSetup>[] => loopFights(1).map((f) => fightSetup(runRules(mods), rng, f));
  const plain = setups([]);

  it('moon: moon gravity', () => {
    for (const s of setups(['moon'])) expect(s.cfg.mods).toContain('lowgrav');
    const fall = (mods: string[]): number => {
      const st = duel(mods);
      const f = st.fighters[0];
      f.y -= 400;
      f.gnd = -1;
      f.act = A.AIR;
      run(st, 20);
      return f.vy;
    };
    expect(fall(['lowgrav'])).toBeLessThan(fall([]) * 0.8);
  });

  it('bighead: twice the head, twice the head hurtbox', () => {
    for (const s of setups(['bighead'])) expect(s.cfg.mods).toContain('bighead');
    const big = duel(['bighead']);
    const small = duel([]);
    const cf = FIGHTERS[big.fighters[0].def];
    const kb = fighterSkel(big, big.fighters[0], cf);
    const ks = fighterSkel(small, small.fighters[0], cf);
    expect(kb.hs).toBe(BIG_HEAD);
    expect(ks.hs).toBeUndefined();
    expect(hurtCapsules(kb, cf)[1][4]).toBeCloseTo(hurtCapsules(ks, cf)[1][4] * BIG_HEAD);
    // the head grows away from the neck
    const d = (k: typeof kb): number => Math.hypot(k.head[0] - k.neck[0], k.head[1] - k.neck[1]);
    expect(d(kb)).toBeCloseTo(d(ks) * BIG_HEAD);
  });

  it('tiny and giant: everyone shrinks or grows', () => {
    for (const s of setups(['tiny'])) expect(s.cfg.mods).toContain('tiny');
    for (const s of setups(['giant'])) expect(s.cfg.mods).toContain('giant');
    const scale = (mods: string[]): number => {
      const st = duel(mods);
      return fighterScale(st, st.fighters[1], FIGHTERS[st.fighters[1].def]);
    };
    expect(scale(['tiny'])).toBeLessThan(scale([]));
    expect(scale(['giant'])).toBeGreaterThan(scale([]));
  });

  it('fast: the match runs at 1.5×', () => {
    expect(runRules(['fast']).speed).toBe(1.5);
    expect(runRules([]).speed).toBe(1);
  });

  it('triple: every hit does three times the damage', () => {
    for (const s of setups(['triple'])) expect(s.cfg.mods).toContain('triple');
    const dmg = (mods: string[]): number => {
      const st = duel(mods);
      applyHit(st, null, st.fighters[1], HIT, OPTS);
      return st.fighters[1].dmg;
    };
    expect(dmg([])).toBe(10);
    expect(dmg(['triple'])).toBe(30);
    // the camera boss gets a third of its HP, so it is hit "three times as hard" too
    const boss = (mods: string[]): number => setups(mods)[8].cfg.players.find((p) => p.boss)!.hpMult!;
    expect(boss(['triple'])).toBeCloseTo(boss([]) / 3);
  });

  it('launch: double knockback', () => {
    for (const s of setups(['launch'])) expect(s.cfg.mods).toContain('launch');
    const spd = (mods: string[]): number => {
      const st = duel(mods);
      st.fighters[1].dmg = 60;
      applyHit(st, null, st.fighters[1], HIT, OPTS);
      return st.fighters[1].lSpd;
    };
    expect(spd(['launch'])).toBeCloseTo(spd([]) * 2);
  });

  it('onestock: one stock each, the host too', () => {
    for (const s of setups(['onestock'])) {
      expect(s.cfg.stocks).toBe(1);
      const st = initState(s.cfg);
      for (const f of st.fighters) if (!s.cfg.players[f.i].grunt && !s.cfg.players[f.i].boss) expect(f.stocks).toBe(1);
    }
    expect(plain[7].cfg.stocks).toBe(3);
  });

  it('monsoon: items pour down', () => {
    for (const s of setups(['monsoon'])) {
      expect(s.cfg.items).toBe(3);
      expect(s.cfg.mods).toContain('itemrain');
    }
    const spawns = (items: number, mods: string[]): number => {
      const st = duel(mods, { items });
      let n = 0;
      for (let i = 0; i < 1800; i++) {
        step(st, [NEUTRAL, NEUTRAL]);
        n += st.ev.filter((e) => e.t === 'itemspawn').length;
      }
      return n;
    };
    expect(spawns(3, ['itemrain'])).toBeGreaterThan(spawns(1, []) * 4);
  });

  it('mirror: every contestant is you, the host is not', () => {
    const ss = setups(['mirror']);
    const me = ss[0].fighter;
    for (const s of ss.slice(0, 7)) for (const p of s.cfg.players) expect(p.fighter).toBe(me);
    expect(ss[7].cfg.players[1].fighter).toBe('max');
    expect(plain.slice(0, 5).some((s) => s.cfg.players.slice(1).some((p) => p.fighter !== me))).toBe(true);
  });

  it('shuffle: a new seeded bro every round', () => {
    const ss = setups(['shuffle']);
    expect(ss[0].fighter).toBe(baseFighter(rng));
    expect(new Set(ss.map((s) => s.fighter)).size).toBeGreaterThan(2);
    // the ladder's mirror round mirrors whoever you are that round
    expect(ss[5].cfg.players[1].fighter).toBe(ss[5].fighter);
    for (const s of ss) expect(ROSTER.some((r) => r.def.id === s.fighter)).toBe(true);
  });

  it('hardest: every CPU at level 9, every loop', () => {
    for (const s of setups(['hardest'])) for (const p of s.cfg.players.slice(1)) if (!p.boss && !p.grunt) expect(p.cpu).toBe(9);
    expect(intensityFor(runRules(['hardest']), 1)).toBe(9);
  });

  it('vampire: your KO heals you to 0%', () => {
    const heal = (mods: string[]): number => {
      const st = duel(mods);
      const [me, foe] = st.fighters;
      me.dmg = 80;
      foe.lastHitBy = 0;
      foe.lastHitT = 0;
      foe.y = 5000;
      foe.gnd = -1;
      foe.act = A.AIR;
      step(st, [NEUTRAL, NEUTRAL]);
      expect(foe.act).toBe(A.DEAD);
      return me.dmg;
    };
    for (const s of setups(['vampire'])) expect(s.cfg.mods).toContain('vampire');
    expect(heal(['vampire'])).toBe(0);
    expect(heal([])).toBe(80);
  });

  it('noshield: holding shield never raises one', () => {
    for (const s of setups(['noshield'])) expect(s.cfg.mods).toContain('noshield');
    const shielded = (mods: string[]): boolean => {
      const st = duel(mods);
      run(st, 30);
      let seen = false;
      for (let i = 0; i < 30; i++) {
        step(st, [pack(0, 0, B_SHIELD), NEUTRAL]);
        if (st.fighters[0].act === A.SHIELD) seen = true;
      }
      return seen;
    };
    expect(shielded([])).toBe(true);
    expect(shielded(['noshield'])).toBe(false);
  });

  it('shrink: the blast zones close in', () => {
    for (const s of setups(['shrink'])) expect(s.cfg.mods).toContain('shrink');
    const st = duel(['shrink']);
    run(st, 3600);
    expect(st.shrink).toBeLessThan(0.9);
  });

  it('lava: it rises', () => {
    for (const s of setups(['lava'])) expect(s.cfg.mods).toContain('lava');
    const st = duel(['lava']);
    let up = false;
    for (let i = 0; i < 1400; i++) {
      step(st, [NEUTRAL, NEUTRAL]);
      if (st.lava > 0) up = true;
    }
    expect(up).toBe(true);
  });

  it('every modifier has a test above', () => {
    const tested = ['moon', 'bighead', 'tiny', 'giant', 'fast', 'triple', 'launch', 'onestock', 'monsoon', 'mirror', 'shuffle', 'hardest', 'vampire', 'noshield', 'shrink', 'lava'];
    expect([...IDS].sort()).toEqual([...tested].sort());
  });
});

describe('every allowed day plays', () => {
  it('each modifier alone and every allowed combination of 2-3: every kind of fight runs', () => {
    const sets = allowedSets();
    expect(sets.length).toBeGreaterThan(100);
    const fights = loopFights(1);
    sets.forEach((mods, n) => {
      const rules = runRules(mods);
      const rng = sdkRng(1000 + n);
      // singles play every fight of the loop; combinations take turns through them
      const which = mods.length === 1 ? fights : [fights[n % fights.length]];
      for (const f of which) {
        const s = fightSetup(rules, rng, f);
        const st = initState(botCfg(s.cfg, 5));
        run(st, mods.length === 1 ? 900 : 300);
        for (const x of st.fighters) expect(Number.isFinite(x.x) && Number.isFinite(x.y) && Number.isFinite(x.dmg), `${mods.join('+')} ${s.title}`).toBe(true);
      }
    });
  }, 120000);
});

describe('the score', () => {
  it('only ever goes up', () => {
    const r = sdkRng(9)('score');
    const s = new FlashScore();
    let last = 0;
    for (let i = 0; i < 2000; i++) {
      const loop = 1 + Math.floor(r() * 4);
      if (r() < 0.6) s.ko(loop, r() < 0.3);
      else s.round((['round', 'max', 'broadcast'] as const)[Math.floor(r() * 3)], loop, Math.floor(r() * 4), Math.floor(r() * 30000));
      expect(Number.isInteger(s.total)).toBe(true);
      expect(s.total).toBeGreaterThan(last);
      last = s.total;
    }
  });

  it('a whole loop played by a CPU in your seat: KOs and wins add up, never down', () => {
    for (const [seed, mods] of [
      [2024, []],
      [77, ['fast', 'vampire', 'bighead']],
    ] as [number, string[]][]) {
      const rng = sdkRng(seed);
      const rules = runRules(mods);
      const score = new FlashScore();
      let fight: Fight = FIRST_FIGHT;
      let last = 0;
      let won = 0;
      while (fight.loop === 1) {
        const s = fightSetup(rules, rng, fight);
        const st = initState(botCfg(s.cfg, 9));
        let kos = 0;
        while (!st.over && st.frame < 60 * 60 * 8) {
          // a CPU doesn't aim at the camera's lens: after a minute of the boss fight, its HP runs out for it
          if (st.boss && st.timer === 3600) st.boss.hp = 0;
          step(st, st.cfg.players.map(() => NEUTRAL));
          for (const k of playerKos(st)) {
            score.ko(fight.loop, k.grunt);
            kos++;
          }
          expect(score.total).toBeGreaterThanOrEqual(last);
          last = score.total;
        }
        expect(st.over, s.title).toBe(true);
        // the KOs we credit are exactly the sim's own count for that slot
        expect(kos).toBe(st.fighters[0].st.kos);
        if (!fightWon(st)) break;
        score.round(s.kind, fight.loop, st.fighters[0].stocks, st.timer);
        expect(score.total).toBeGreaterThan(last);
        last = score.total;
        won++;
        fight = nextFight(fight);
      }
      expect(won).toBeGreaterThan(0);
      expect(score.total).toBeLessThan(FLASH_INFO.maxScore);
    }
  }, 120000);
});
