// Dev helper: self-destructs vs KOs per fighter in CPU 1v1s on every stage (DEBUG_SD=1)
import { writeFileSync } from 'node:fs';
import { it } from 'vitest';
import { ROSTER, STAGES } from '../src/sim/data';
import { initState, step } from '../src/sim/sim';
import type { MatchCfg } from '../src/sim/types';

it.skipIf(!process.env.DEBUG_SD)('sd rates', () => {
  const lines: string[] = [];
  let totalSd = 0;
  let totalFalls = 0;
  for (const r of ROSTER) {
    let sds = 0;
    let falls = 0;
    let frames = 0;
    let dealt = 0;
    for (const [si, stg] of STAGES.entries()) {
      const opp = ROSTER[(ROSTER.indexOf(r) + 1 + si) % ROSTER.length].def.id;
      const c: MatchCfg = { seed: 100 + si, stage: stg.id, mode: 'stock', stocks: 2, time: 180, hp: 150, items: 1, ult: 'meter', mods: [], teams: false, friendlyFire: false,
        players: [r.def.id, opp].map((f, i) => ({ fighter: f, color: i, team: i, cpu: 8, name: f, tapJump: false })) };
      const st = initState(c);
      while (!st.over && st.frame < 60 * 200) step(st, [0, 0]);
      sds += st.fighters[0].st.sds;
      falls += st.fighters[0].st.falls;
      dealt += st.fighters[0].st.dealt;
      frames += st.frame;
    }
    totalSd += sds;
    totalFalls += falls;
    lines.push(`${r.def.id.padEnd(9)} falls ${falls} sds ${sds} dealt ${Math.round(dealt)} avg ${(frames / 4 / 60).toFixed(0)}s`);
  }
  lines.push(`TOTAL falls ${totalFalls} sds ${totalSd}`);
  writeFileSync(process.env.DEBUG_OUT || 'sd.txt', lines.join('\n'));
});
