// Balance tuner (D25): runs the round robin in three conditions (CPU 9 with ultimates, CPU 9 without, CPU 6), then
// nudges each fighter's multipliers in src/data/balance.ts toward a 50% average win rate and repeats.
//   node scripts/tune-balance.mjs --iters 6 --seeds 8
// Below 50%: more damage and range, and more recovery when the fighter dies off the bottom more than most (it can't
// get back). Above 50%: a little less damage. Every step is damped (the results are noisy) and clamped.
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const arg = (n, d) => {
  const i = process.argv.indexOf(`--${n}`);
  return i >= 0 ? process.argv[i + 1] : d;
};
const ITERS = Number(arg('iters', 6));
const SEEDS = arg('seeds', '8');
/** step size (1 = the full step); results are noisy, so later passes use less */
const GAIN = Number(arg('gain', 1));
/** 'mean': aim each fighter's average at 50%; 'minimax': aim the middle of its best and worst condition at 50%,
 * so no single condition drifts far (blended with the mean) */
const TARGET = arg('target', 'mean');
const CONDITIONS = [
  ['--level', '9', '--ult', 'meter'],
  ['--level', '9', '--ult', 'off'],
  ['--level', '6', '--ult', 'meter'],
];
const balanceFile = join(root, 'src/data/balance.ts');
const header = readFileSync(balanceFile, 'utf8').split('export const TUNING')[0];

function readTuning() {
  const src = readFileSync(balanceFile, 'utf8');
  const body = src.split('export const TUNING: Record<string, Tuning> = ')[1].replace(/;\s*$/, '');
  return Function(`return (${body})`)();
}

function writeTuning(t) {
  const ids = Object.keys(t).sort();
  const fmt = (x) => Number(x.toFixed(3));
  const lines = ids.map((id) => {
    const v = t[id];
    const parts = [];
    if (v.power && Math.abs(v.power - 1) > 0.0005) parts.push(`power: ${fmt(v.power)}`);
    if (v.reach && Math.abs(v.reach - 1) > 0.0005) parts.push(`reach: ${fmt(v.reach)}`);
    if (v.recovery && Math.abs(v.recovery - 1) > 0.0005) parts.push(`recovery: ${fmt(v.recovery)}`);
    if (v.weight && Math.abs(v.weight - 1) > 0.0005) parts.push(`weight: ${fmt(v.weight)}`);
    return parts.length ? `  ${id}: { ${parts.join(', ')} },` : null;
  });
  writeFileSync(balanceFile, `${header}export const TUNING: Record<string, Tuning> = {\n${lines.filter(Boolean).join('\n')}\n};\n`);
}

function run(cond, tag) {
  const out = join(tmpdir(), `syb-tune-${tag}.json`);
  execFileSync(process.execPath, [join(root, 'scripts/balance.mjs'), '--seeds', SEEDS, ...cond, '--out', out], { stdio: ['ignore', 'ignore', 'inherit'] });
  return JSON.parse(readFileSync(out, 'utf8'));
}

const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
let t = readTuning();
for (let it = 0; it <= ITERS; it++) {
  const res = CONDITIONS.map((c, i) => run(c, `${it}-${i}`));
  const ids = res[0].rows.map((r) => r.id);
  const by = (k, id) => res.map((r) => r.rows.find((x) => x.id === id)[k]);
  const mean = (a) => a.reduce((x, y) => x + y, 0) / a.length;
  const rate = Object.fromEntries(
    ids.map((id) => {
      const rs = by('rate', id);
      return [id, TARGET === 'minimax' ? (mean(rs) + (Math.min(...rs) + Math.max(...rs)) / 2) / 2 : mean(rs)];
    }),
  );
  const bottom = Object.fromEntries(ids.map((id) => [id, mean(by('bottom', id))]));
  const meanBottom = mean(Object.values(bottom));
  const spreads = res.map((r) => (r.spread * 100).toFixed(1));
  const avg = Object.values(rate);
  const avgSpread = ((Math.max(...avg) - Math.min(...avg)) * 100).toFixed(1);
  console.log(`\niteration ${it}: spreads ${spreads.join(' / ')} points, of the average ${avgSpread}`);
  for (const id of [...ids].sort((a, b) => rate[b] - rate[a])) console.log(`  ${id.padEnd(9)} ${(rate[id] * 100).toFixed(1)}%  (${by('rate', id).map((x) => (x * 100).toFixed(0)).join('/')})  bottom ${bottom[id].toFixed(2)}  ${JSON.stringify(t[id] ?? {})}`);
  if (it === ITERS) break;
  for (const id of ids) {
    const d = (0.5 - rate[id]) * GAIN;
    const v = (t[id] ??= {});
    if (d > 0) {
      v.power = clamp((v.power ?? 1) * (1 + 0.7 * d), 0.8, 1.45);
      v.reach = clamp((v.reach ?? 1) * (1 + 0.6 * d), 1, 1.3);
      if (bottom[id] > meanBottom + 0.05) v.recovery = clamp((v.recovery ?? 1) * (1 + 1.5 * d), 1, 1.35);
    } else v.power = clamp((v.power ?? 1) * (1 + 0.45 * d), 0.8, 1.45);
  }
  writeTuning(t);
}
