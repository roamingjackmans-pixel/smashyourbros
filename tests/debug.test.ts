// Dev helper: DEBUG_MATCH=studio,2,kit DEBUG_OUT=file npx vitest run tests/debug.test.ts  (a CPU match's progress)
import { writeFileSync } from 'node:fs';
import { it } from 'vitest';
import { ACT_NAMES } from '../src/sim/acts';
import { initState, step } from '../src/sim/sim';
import type { MatchCfg } from '../src/sim/types';

it.skipIf(!process.env.DEBUG_MATCH)('debug match', () => {
  const [stage = 'studio', nStr = '2', fighters = 'kit'] = (process.env.DEBUG_MATCH || '').split(',');
  const n = Number(nStr);
  const ids = fighters.split('+');
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
    players: Array.from({ length: n }, (_, i) => ({ fighter: ids[i % ids.length], color: i, team: i, cpu: 9 - (i % 3), name: 'P' + i, tapJump: false })),
  };
  const st = initState(c);
  const counts: Record<string, number> = {};
  const lines: string[] = [];
  while (!st.over && st.frame < 60 * 60 * 6) {
    step(st, [0, 0, 0, 0]);
    for (const f of st.fighters) counts[ACT_NAMES[f.act]] = (counts[ACT_NAMES[f.act]] || 0) + 1;
    for (const e of st.ev) if (e.t === 'ko') lines.push(`KO ${st.frame} p${e.p}`);
    if (st.frame % 1200 === 0) lines.push(st.frame + ' ' + st.fighters.map((f) => `p${f.i} ${ACT_NAMES[f.act]} x${f.x.toFixed(0)} y${f.y.toFixed(0)} ${f.dmg.toFixed(0)}% s${f.stocks} hits${f.st.hits}`).join(' | '));
  }
  lines.push(`over ${st.over} frame ${st.frame} ${JSON.stringify(counts)}`);
  writeFileSync(process.env.DEBUG_OUT || 'debug-match.txt', lines.join('\n'));
});
