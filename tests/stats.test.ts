// Lifetime statistics and achievements (D24): the match tracker, recordMatch, the achievement list, and that a
// well-played save still fits the server's profile limit (400 kB, Shoallhell's server).
import { describe, expect, it } from 'vitest';
import { ACHIEVEMENTS, checkAchievements } from '../src/data/achievements';
import { TASKS } from '../src/data/tasks';
import { favouriteMove, fixProfile, newProfile, recordMatch } from '../src/game/profile';
import { matchExtra, MatchTracker, moveName } from '../src/game/stats';
import { ROSTER, STAGES } from '../src/sim/data';
import { initState, step } from '../src/sim/sim';
import type { MatchCfg, State } from '../src/sim/types';

function cfg(fighters: string[], extra: Partial<MatchCfg> = {}): MatchCfg {
  return {
    seed: 11,
    stage: 'studio',
    mode: 'stock',
    stocks: 2,
    time: 0,
    hp: 150,
    items: 0,
    ult: 'meter',
    mods: [],
    teams: false,
    friendlyFire: false,
    players: fighters.map((f, i) => ({ fighter: f, color: i, team: i, cpu: 9, name: `P${i + 1}`, tapJump: false })),
    ...extra,
  };
}

/** a CPU match where slot 0 counts as this machine's player, watched by a tracker like the match runner does */
function watched(c: MatchCfg): State {
  const st = initState(c);
  const t = new MatchTracker([0]);
  const inputs = c.players.map(() => 0);
  const seen = new Set<string>();
  while (!st.over && st.frame < 60 * 60 * 6) {
    step(st, inputs);
    for (const e of st.ev) {
      const k = `${st.frame}:${e.t}:${e.p}:${e.x}:${e.y}`;
      if (seen.has(k)) continue;
      seen.add(k);
      t.event(e, st);
    }
    t.step(st);
  }
  t.finish(st);
  return st;
}

describe('match tracker', () => {
  it('counts moves, combos and time for the local player only', () => {
    const st = watched(cfg(['kit', 'clank']));
    const x = matchExtra(st)!;
    expect(x).toBeDefined();
    expect(x.frames).toBe(st.frame);
    const used = Object.values(x.moves).reduce((a, b) => a + b, 0);
    expect(used).toBeGreaterThan(10);
    expect(x.bestCombo).toBeGreaterThanOrEqual(1);
    for (const id of Object.keys(x.moves)) expect(moveName(id)).toBeTruthy();
  });

  it('folds a match into the lifetime stats', () => {
    const st = watched(cfg(['zippy', 'granny'], { stage: 'orbit' }));
    const p = newProfile();
    recordMatch(p, st, { mode: 'versus', local: [0] });
    expect(p.stats.matches).toBe(1);
    expect(p.stats.m_versus).toBe(1);
    expect(p.stats.mode_stock).toBe(1);
    expect(p.stats.stage_orbit).toBe(1);
    expect(p.stats.time).toBe(Math.round(st.frame / 60));
    expect(p.stats.hits).toBe(st.fighters[0].st.hits);
    expect(p.stats.bestCombo).toBe(matchExtra(st)!.bestCombo);
    expect(favouriteMove(p)).toBeTruthy();
    const won = st.winner.includes(0);
    expect(p.stats.w_versus ?? 0).toBe(won ? 1 : 0);
    // a second, worse match doesn't lower the records
    const before = p.stats.bestCombo;
    const st2 = initState(cfg(['zippy', 'granny']));
    step(st2, [0, 0]);
    st2.over = true;
    recordMatch(p, st2, { mode: 'versus', local: [0] });
    expect(p.stats.bestCombo).toBe(before);
    expect(p.stats.matches).toBe(2);
  });

  it('practice is never recorded', () => {
    const p = newProfile();
    recordMatch(p, initState(cfg(['kit', 'kit'])), { mode: 'practice', local: [0] });
    expect(p.stats.matches).toBeUndefined();
  });
});

describe('achievements', () => {
  it('has 30–50 achievements with unique ids, positive goals and safe progress functions', () => {
    expect(ACHIEVEMENTS.length).toBeGreaterThanOrEqual(30);
    expect(ACHIEVEMENTS.length).toBeLessThanOrEqual(50);
    expect(new Set(ACHIEVEMENTS.map((a) => a.id)).size).toBe(ACHIEVEMENTS.length);
    const p = newProfile();
    for (const a of ACHIEVEMENTS) {
      expect(a.goal).toBeGreaterThan(0);
      expect(a.name.length).toBeGreaterThan(3);
      expect(a.progress(p)).toBeGreaterThanOrEqual(0);
    }
  });

  it('unlock once, from the stats', () => {
    const p = newProfile();
    expect(checkAchievements(p)).toEqual([]);
    p.stats.matches = 1;
    p.stats.kos = 1;
    const got = checkAchievements(p, 1_700_000_000_000).map((a) => a.id);
    expect(got).toContain('first-match');
    expect(got).toContain('ko-1');
    expect(p.ach['first-match']).toBe(1_700_000_000);
    expect(checkAchievements(p)).toEqual([]);
  });

  it('variety ones count modes and stages played', () => {
    const p = newProfile();
    for (const m of ['stock', 'time', 'stamina', 'coin', 'koth']) p.stats[`mode_${m}`] = 1;
    for (const s of STAGES) p.stats[`stage_${s.id}`] = 1;
    const got = checkAchievements(p).map((a) => a.id);
    expect(got).toContain('modes');
    expect(got).toContain('stages');
  });

  it('the twelve unlock tasks are untouched', () => {
    expect(TASKS).toHaveLength(12);
  });

  it('a save with everything filled in stays far under the server’s 400 kB limit', () => {
    const p = newProfile();
    for (const a of ACHIEVEMENTS) p.ach[a.id] = 1_800_000_000;
    for (let i = 0; i < 120; i++) p.stats[`stat_${i}`] = 123456789;
    for (const r of ROSTER) p.used[r.def.id] = p.wins[r.def.id] = 9999;
    for (let i = 0; i < 60; i++) p.moves[`move${i}`] = 99999;
    for (let i = 0; i < 12; i++) p.recent.push({ at: Date.now(), mode: 'versus', result: 'win', fighter: 'kit', kos: 3 });
    const size = JSON.stringify(fixProfile(p)).length;
    expect(size).toBeLessThan(40_000);
  });
});
