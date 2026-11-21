// Dev helper: round-robin CPU 1v1 win rates (DEBUG_BALANCE=1). Every pairing, both sides, two stages.
import { writeFileSync } from 'node:fs';
import { it } from 'vitest';
import { ROSTER } from '../src/sim/data';
import { initState, step } from '../src/sim/sim';
import type { MatchCfg } from '../src/sim/types';

it.skipIf(!process.env.DEBUG_BALANCE)('balance', () => {
  const ids = ROSTER.map((r) => r.def.id);
  const wins: Record<string, number> = {};
  const games: Record<string, number> = {};
  const ultKos: Record<string, number> = {};
  const stages = ['studio', 'galleon', 'orbit'];
  let seed = 1;
  for (let a = 0; a < ids.length; a++) {
    for (let b = 0; b < ids.length; b++) {
      if (a === b) continue;
      for (const stage of stages) {
        const c: MatchCfg = {
          seed: seed++,
          stage,
          mode: 'stock',
          stocks: 2,
          time: 240,
          hp: 150,
          items: 0,
          ult: process.env.DEBUG_BALANCE === 'noult' ? 'off' : 'meter',
          mods: [],
          teams: false,
          friendlyFire: false,
          players: [ids[a], ids[b]].map((f, i) => ({ fighter: f, color: i, team: i, cpu: 8, name: f, tapJump: false })),
        };
        const st = initState(c);
        let ultActive = [-1, -1];
        while (!st.over && st.frame < 60 * 260) {
          step(st, [0, 0]);
          for (const e of st.ev) {
            if (e.t === 'ult') ultActive[e.p] = st.frame;
            if (e.t === 'ko') {
              const killer = 1 - e.p;
              if (ultActive[killer] >= 0 && st.frame - ultActive[killer] < 300) ultKos[ids[killer === 0 ? a : b]] = (ultKos[ids[killer === 0 ? a : b]] ?? 0) + 1;
            }
          }
          void ultActive;
        }
        for (const [i, id] of [ids[a], ids[b]].entries()) {
          games[id] = (games[id] ?? 0) + 1;
          if (st.winner.length === 1 && st.winner[0] === i) wins[id] = (wins[id] ?? 0) + 1;
        }
        ultActive = [-1, -1];
      }
    }
  }
  const lines = ids
    .map((id) => ({ id, rate: (wins[id] ?? 0) / games[id] }))
    .sort((x, y) => y.rate - x.rate)
    .map((r) => `${r.id.padEnd(9)} ${(r.rate * 100).toFixed(0).padStart(3)}%  ult KOs ${ultKos[r.id] ?? 0}`);
  writeFileSync(process.env.DEBUG_OUT || 'balance.txt', lines.join('\n'));
}, 600000);
