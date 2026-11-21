// Headless matches: every fighter plays CPU-vs-CPU stock matches to the end, and the simulation is deterministic.
import { describe, expect, it } from 'vitest';
import { A } from '../src/sim/acts';
import { ROSTER, STAGES } from '../src/sim/data';
import { checksum, cloneState, initState, step } from '../src/sim/sim';
import type { MatchCfg, State } from '../src/sim/types';

function cfg(fighters: string[], stage = 'studio', extra: Partial<MatchCfg> = {}, seed = 7): MatchCfg {
  return {
    seed,
    stage,
    mode: 'stock',
    stocks: 2,
    time: 150,
    hp: 150,
    items: 0,
    ult: 'meter',
    mods: [],
    teams: false,
    friendlyFire: false,
    players: fighters.map((f, i) => ({ fighter: f, color: i, team: i, cpu: 9 - (i % 3), name: `P${i + 1}`, tapJump: false })),
    ...extra,
  };
}

function play(c: MatchCfg, max = 60 * 60 * 6): State {
  const st = initState(c);
  const inputs = c.players.map(() => 0);
  while (!st.over && st.frame < max) step(st, inputs);
  return st;
}

describe('simulation', () => {
  it('is deterministic (same config, same result)', () => {
    const c = cfg(['kit', 'kit', 'kit'], 'studio', { items: 2, mods: ['meteors'] });
    const a = initState(c);
    const b = initState(structuredClone(c));
    for (let i = 0; i < 3000; i++) {
      step(a, [0, 0, 0]);
      step(b, [0, 0, 0]);
    }
    expect(checksum(a)).toBe(checksum(b));
  });

  it('rolls back cleanly (clone, replay, same state)', () => {
    const c = cfg(['kit', 'kit'], 'galleon', { items: 3 });
    const st = initState(c);
    for (let i = 0; i < 600; i++) step(st, [0, 0]);
    const snap = cloneState(st);
    for (let i = 0; i < 300; i++) step(st, [0, 0]);
    for (let i = 0; i < 300; i++) step(snap, [0, 0]);
    expect(checksum(snap)).toBe(checksum(st));
  });

  for (const stg of STAGES) {
    it(`CPU match ends on ${stg.name}`, () => {
      const ids = ROSTER.map((f) => f.def.id);
      const st = play(cfg([ids[0], ids[ids.length > 1 ? 1 : 0]], stg.id, { items: 2 }));
      expect(st.over).toBe(true);
      expect(st.winner.length).toBeGreaterThan(0);
      const hits = st.fighters.reduce((n, f) => n + f.st.hits, 0);
      expect(hits).toBeGreaterThan(5);
    });
  }

  for (const f of ROSTER) {
    it(`${f.def.name}: 4-player free-for-all finishes`, () => {
      const others = ROSTER.map((r) => r.def.id).filter((id) => id !== f.def.id);
      const four = [f.def.id, others[0] ?? f.def.id, others[1] ?? f.def.id, others[2] ?? f.def.id];
      const st = play(cfg(four, 'studio', { items: 1 }, 11));
      expect(st.over).toBe(true);
      // nobody stuck in a broken state
      for (const x of st.fighters) expect(Number.isFinite(x.x) && Number.isFinite(x.y)).toBe(true);
    });
  }

  it('every move of every fighter runs to its end without throwing', () => {
    for (const f of ROSTER) {
      for (const id of f.moveIds) {
        const st = initState(cfg([f.def.id, f.def.id], 'studio'));
        for (let i = 0; i < 160; i++) step(st, [0, 0]);
        const me = st.fighters[0];
        me.cpu = 0;
        me.act = A.IDLE;
        // put airborne moves in the air
        const m = f.moves[f.moveIdx[id]];
        if (m.air) {
          me.y = -300;
          me.gnd = -1;
          me.act = A.AIR;
        }
        me.mv = f.moveIdx[id];
        me.act = A.MOVE;
        me.mf = 1;
        for (let i = 0; i < m.frames + 30; i++) step(st, [0, 0]);
        expect(Number.isFinite(me.x)).toBe(true);
      }
    }
  });
});
