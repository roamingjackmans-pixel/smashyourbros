// Dev helper: where CPUs spend their time (DEBUG_TRACE=stage[,fighterA+fighterB])
import { writeFileSync } from 'node:fs';
import { it } from 'vitest';
import { A, ACT_NAMES } from '../src/sim/acts';
import { FIGHTERS } from '../src/sim/data';
import { initState, step } from '../src/sim/sim';
import type { MatchCfg } from '../src/sim/types';

it.skipIf(!process.env.DEBUG_TRACE)('trace', () => {
  const [stage = 'studio', ids = 'kit+kit'] = (process.env.DEBUG_TRACE || '').split(',');
  const fs = ids.split('+');
  const c: MatchCfg = {
    seed: 7,
    stage,
    mode: 'stock',
    stocks: 2,
    time: 0,
    hp: 150,
    items: 1,
    ult: 'meter',
    mods: [],
    teams: false,
    friendlyFire: false,
    players: [0, 1].map((i) => ({ fighter: fs[i % fs.length], color: i, team: i, cpu: 9 - i, name: 'P' + i, tapJump: false })),
  };
  const st = initState(c);
  const lines: string[] = [];
  const moves = new Map<string, number>();
  while (!st.over && st.frame < 12000) {
    step(st, [0, 0]);
    for (const f of st.fighters) {
      if (f.act === A.MOVE) {
        const id = `${FIGHTERS[f.def].moveIds[f.mv]} p${f.i}`;
        moves.set(id, (moves.get(id) ?? 0) + 1);
      }
    }
    if (st.frame % 300 === 0) lines.push(`@${st.frame} ` + st.fighters.map((f) => `p${f.i} ${ACT_NAMES[f.act]}${f.act === A.MOVE ? ':' + FIGHTERS[f.def].moveIds[f.mv] + ' mf' + f.mf : ''} x${f.x.toFixed(0)} y${f.y.toFixed(0)} gnd${f.gnd} face${f.facing} ${f.dmg.toFixed(0)}% bm${f.bm.join(',')}`).join(' | '));
  }
  lines.push(JSON.stringify([...moves.entries()].sort((a, b) => b[1] - a[1]).slice(0, 12)));
  writeFileSync(process.env.DEBUG_OUT || 'trace.txt', lines.join('\n'));
});
