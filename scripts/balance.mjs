// Balance report (D25): every fighter against every other, both sides, every stage, several seeds, CPU vs CPU at
// one level, run across worker threads. Prints win rates and the stats behind them and writes JSON.
//   npm run balance                       (3 seeds, CPU level 9, 2 stocks)
//   node scripts/balance.mjs --seeds 6 --level 9 --stocks 2 --ult off --items 2 --out balance.json
//   npm run balance -- --ladder           (the difficulty curve: CPU level against CPU level, D26)
// The sim is bundled once with rolldown (TypeScript → one ESM file) so plain Node workers can run it.
import { Worker, isMainThread, parentPort, workerData } from 'node:worker_threads';
import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { cpus, tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, '..');

function arg(name, d) {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? process.argv[i + 1] : d;
}

/** one match: [a, b, stage, seed] → result */
function play(sim, job, o) {
  const [a, b, stage, seed, la, lb] = job;
  const lv = [la ?? o.level, lb ?? o.level];
  const cfg = {
    seed,
    stage,
    mode: 'stock',
    stocks: o.stocks,
    time: o.minutes * 60,
    hp: 150,
    items: o.items,
    ult: o.ult,
    mods: [],
    teams: false,
    friendlyFire: false,
    hazards: false,
    players: [a, b].map((f, i) => ({ fighter: f, color: i, team: i, cpu: lv[i], name: f, tapJump: false })),
  };
  const st = sim.initState(cfg);
  const bottom = [0, 0];
  const limit = 60 * 60 * (o.minutes + 1);
  while (!st.over && st.frame < limit) {
    sim.step(st, [0, 0]);
    for (const e of st.ev) if (e.t === 'ko' && e.a === 3 && e.p >= 0 && e.p < 2) bottom[e.p]++;
  }
  const winner = st.winner.length === 1 ? st.winner[0] : -1;
  return {
    a,
    b,
    stage,
    winner,
    lv,
    frames: st.frame,
    f: st.fighters.slice(0, 2).map((f, i) => ({ kos: f.st.kos, falls: f.st.falls, sds: f.st.sds, dealt: f.st.dealt, ults: f.st.ults, bottom: bottom[i], stocks: f.stocks })),
  };
}

if (!isMainThread) {
  const sim = await import(workerData.bundle);
  const out = [];
  for (const job of workerData.jobs) out.push(play(sim, job, workerData.o));
  parentPort.postMessage(out);
} else {
  const o = {
    seeds: Number(arg('seeds', 3)),
    level: Number(arg('level', 9)),
    stocks: Number(arg('stocks', 2)),
    minutes: Number(arg('minutes', 4)),
    ult: arg('ult', 'meter'),
    items: Number(arg('items', 0)),
    only: arg('only', ''),
    ladder: process.argv.includes('--ladder'),
  };
  const outFile = arg('out', '');
  const t0 = Date.now();
  // bundle the sim
  const dir = join(tmpdir(), 'syb-balance');
  mkdirSync(dir, { recursive: true });
  const entry = join(dir, 'entry.ts');
  const p = (f) => JSON.stringify(join(root, f).replace(/\\/g, '/'));
  writeFileSync(entry, `export { initState, step } from ${p('src/sim/sim.ts')};\nexport { ROSTER, STAGES } from ${p('src/sim/data.ts')};\n`);
  const { build } = await import('rolldown');
  const bundleFile = join(dir, `sim-${process.pid}.mjs`);
  await build({ input: entry, output: { file: bundleFile, format: 'esm' }, logLevel: 'silent' });
  const bundle = pathToFileURL(bundleFile).href;
  const sim = await import(bundle);
  const ids = sim.ROSTER.map((r) => r.def.id);
  const stages = sim.STAGES.filter((s) => !s.hidden).map((s) => s.id);
  // every ordered pair (both sides), every stage, every seed
  const jobs = [];
  let seed = 1000;
  if (o.ladder) {
    // level against level: every fighter against three others, both sides, every stage
    const pairs = [[1, 2], [2, 3], [3, 4], [4, 5], [5, 6], [6, 7], [7, 8], [8, 9], [1, 3], [1, 5], [3, 6], [5, 9], [6, 9], [1, 9]];
    for (const [la, lb] of pairs)
      for (let i = 0; i < ids.length; i++)
        for (let k = 1; k <= 3; k++) {
          const a = ids[i];
          const b = ids[(i + k * 5) % ids.length];
          const stage = stages[(i + k) % stages.length];
          for (let q = 0; q < Math.max(1, Math.round(o.seeds / 3)); q++) {
            jobs.push([a, b, stage, seed++, la, lb]);
            jobs.push([b, a, stage, seed++, lb, la]);
          }
        }
  } else
    for (const a of ids)
      for (const b of ids) {
        if (a === b) continue;
        if (o.only && a !== o.only && b !== o.only) continue;
        for (const stage of stages) for (let k = 0; k < o.seeds; k++) jobs.push([a, b, stage, seed++]);
      }
  const n = Math.max(1, Math.min(cpus().length - 2, 22));
  const chunks = Array.from({ length: n }, () => []);
  jobs.forEach((j, i) => chunks[i % n].push(j));
  const results = (
    await Promise.all(
      chunks.map(
        (c) =>
          new Promise((res, rej) => {
            const w = new Worker(fileURLToPath(import.meta.url), { workerData: { bundle, jobs: c, o } });
            w.once('message', res);
            w.once('error', rej);
          }),
      ),
    )
  ).flat();
  rmSync(bundleFile, { force: true });
  if (o.ladder) {
    // the lower level's share of wins in each pairing, plus how it lost (falls off the bottom, self-destructs)
    const by = new Map();
    for (const r of results) {
      const lo = r.lv[0] < r.lv[1] ? 0 : 1;
      const key = `${r.lv[lo]} vs ${r.lv[1 - lo]}`;
      const g = by.get(key) ?? { games: 0, lowWins: 0, draws: 0, lowFalls: 0, lowSds: 0, highFalls: 0, secs: 0 };
      g.games++;
      if (r.winner === lo) g.lowWins++;
      else if (r.winner < 0) g.draws++;
      g.lowFalls += r.f[lo].falls;
      g.lowSds += r.f[lo].sds;
      g.highFalls += r.f[1 - lo].falls;
      g.secs += r.frames / 60;
      by.set(key, g);
    }
    const lines = [`${results.length} matches, ${o.stocks} stocks, ult ${o.ult}: lower level's win rate`, 'pairing   low wins   low falls/g  low SDs/g  high falls/g  secs'];
    for (const [k, g] of by) lines.push(`${k.padEnd(8)}  ${(((g.lowWins + g.draws / 2) / g.games) * 100).toFixed(1).padStart(6)}%    ${(g.lowFalls / g.games).toFixed(2).padStart(6)}     ${(g.lowSds / g.games).toFixed(2).padStart(6)}     ${(g.highFalls / g.games).toFixed(2).padStart(6)}    ${(g.secs / g.games).toFixed(0).padStart(4)}`);
    console.log(lines.join('\n'));
    if (outFile) writeFileSync(outFile, JSON.stringify({ o, matches: results.length, ladder: Object.fromEntries(by) }, null, 1));
    process.exit(0);
  }
  // aggregate
  const agg = Object.fromEntries(ids.map((id) => [id, { games: 0, wins: 0, draws: 0, kos: 0, falls: 0, sds: 0, bottom: 0, dealt: 0, ults: 0, frames: 0 }]));
  const vs = Object.fromEntries(ids.map((id) => [id, Object.fromEntries(ids.map((x) => [x, [0, 0]]))]));
  for (const r of results)
    for (let i = 0; i < 2; i++) {
      const id = i ? r.b : r.a;
      const opp = i ? r.a : r.b;
      const g = agg[id];
      g.games++;
      if (r.winner === i) g.wins++;
      else if (r.winner < 0) g.draws++;
      const s = r.f[i];
      g.kos += s.kos;
      g.falls += s.falls;
      g.sds += s.sds;
      g.bottom += s.bottom;
      g.dealt += s.dealt;
      g.ults += s.ults;
      g.frames += r.frames;
      vs[id][opp][0] += r.winner === i ? 1 : r.winner < 0 ? 0.5 : 0;
      vs[id][opp][1]++;
    }
  const rows = ids
    .filter((id) => agg[id].games)
    .map((id) => {
      const g = agg[id];
      return {
        id,
        games: g.games,
        rate: (g.wins + g.draws * 0.5) / g.games,
        kos: g.kos / g.games,
        falls: g.falls / g.games,
        sds: g.sds / g.games,
        bottom: g.bottom / g.games,
        dealt: g.dealt / g.games,
        ults: g.ults / g.games,
        secs: g.frames / g.games / 60,
        vs: Object.fromEntries(Object.entries(vs[id]).filter(([, v]) => v[1]).map(([k, v]) => [k, v[0] / v[1]])),
      };
    })
    .sort((x, y) => y.rate - x.rate);
  const rates = rows.map((r) => r.rate);
  const spread = Math.max(...rates) - Math.min(...rates);
  const pct = (x) => `${(x * 100).toFixed(1)}%`;
  const lines = [
    `${results.length} matches, CPU level ${o.level}, ${o.stocks} stocks, ult ${o.ult}, items ${o.items}, ${stages.length} stages × ${o.seeds} seeds, ${((Date.now() - t0) / 1000).toFixed(0)} s`,
    `spread (best − worst): ${(spread * 100).toFixed(1)} points`,
    'fighter    win%   KOs/g falls/g  SDs/g  off-bottom/g  dmg/g  ults/g  secs',
    ...rows.map((r) => `${r.id.padEnd(9)} ${pct(r.rate).padStart(6)}  ${r.kos.toFixed(2).padStart(5)}  ${r.falls.toFixed(2).padStart(5)}  ${r.sds.toFixed(2).padStart(5)}  ${r.bottom.toFixed(2).padStart(7)}       ${r.dealt.toFixed(0).padStart(4)}  ${r.ults.toFixed(2).padStart(5)}  ${r.secs.toFixed(0).padStart(4)}`),
  ];
  console.log(lines.join('\n'));
  if (outFile) writeFileSync(outFile, JSON.stringify({ o, matches: results.length, spread, rows }, null, 1));
}
