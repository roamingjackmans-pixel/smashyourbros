# Balance report

The owner asked on 2026-11-21 to make all 16 fighters' win rates roughly the same, within 15% of each other, by
giving the weaker ones more attack range, more damage and a better way back to the stage. Decision: D25. Measured
on build 1.0.5 (before) and this change (after).

## Result

Every fighter's **overall win rate is now between 49.0% and 51.4%**. That's a 2.5-point spread, with the best only
1.05× the worst; before it was a 16.9-point spread, from 41.3% to 58.2%. Fighters also stay within 15 points of each
other in each separate condition below except one: with mid-level CPUs (CPU 6), Nimbus and Sir Clank still sit 16 points
apart (see *What's left*).

## How it is measured

`npm run balance` plays a round robin of CPU-versus-CPU stock matches: **every fighter against every other fighter,
from both sides, on all four stages, with many seeds**. The figures here use 24 seeds: 16 × 15 ordered pairings ×
4 stages × 24 = 23,040 matches per condition, 2,880 games per fighter, about 80 seconds on all CPU cores. The rules
are 2 stocks, no items, no stage hazards and a 4-minute limit; a time-out counts as half a win. A fighter's **win
rate** is its share of its games. With this many games a fighter's rate is accurate to about ±1 point, so a spread
reads about 3 points high from noise alone.

The ranking depends on how the CPUs play, so the tuning was checked under three conditions:

- **CPU 9**: the strongest CPU, with ultimates (default)
- **CPU 9 without ultimates**: the "Competitive" preset turns them off
- **CPU 6**: a mid-level CPU

The game's **default rules** were never tuned on, so they are a fresh check: 3 stocks, items on (Some), ultimates on,
CPU 9, 12 seeds.

Next to the win rate, the report counts these per game: KOs, falls, self-destructs, **deaths off the bottom of the
screen** (a fighter who couldn't get back to the stage), damage dealt, ultimates and match length.

**Caveat:** these are CPU results. The CPU plays every fighter with the same logic, so a fighter whose strength
needs human tricks can play stronger or weaker in human hands; that includes Echo's rewind, Inverta's gravity flips
and Smudge's paint. The numbers say the fighters are even *for equal play*.

## A CPU bug found on the way

While a CPU did its up-special to recover, it stopped steering for the ledge and ran its fighting logic instead,
steering at its opponent. Fighters whose up-special drifts drifted the wrong way. Hoot's teleport, which goes
wherever the stick points, went straight up or out to sea; he died off the bottom 0.69 times a game, twice the
roster average. The CPU now steers for the ledge during an up-special: full drift toward it, and teleports aimed
straight at it (`aim` on the move). This also makes Story, Classic and versus CPUs recover properly. The tuning was
redone on top of the fix, because balancing around a broken CPU would have made the human-played fighters wrong.

## The knobs

`src/data/balance.ts` holds four multipliers per fighter. They are applied once when the fighters load, so online
matches stay in sync and the sim stays deterministic:

- **Damage** (`power`): every hit and projectile, and with it knockback.
- **Range** (`reach`): every hitbox's radius and forward offset, grab range and projectile hitboxes.
- **Recovery** (`recovery`): up-special lift and drift (Hoot's teleport speed), plus half as much on air-jump speed
  and air speed.
- **Weight** (`weight`): heavier fighters fly less far.

`node scripts/tune-balance.mjs` (`npm run balance:tune`) did most of the work. It ran the three conditions, then
nudged each fighter toward 50%:

- below 50%: more damage and range, and more recovery if it died off the bottom more than most;
- above 50%: a little less damage.

Each step was damped and capped, and the tuner ran over several passes. Sir Clank and Nimbus were then set by hand
from one-knob-at-a-time experiments. Their results depend on the CPU's skill: Clank is weak against mid-level CPUs,
Nimbus strong. Range, recovery and weight move one condition more than another, while damage moves every condition
equally.

Recovery isn't a free buff. A faster up-special can overshoot the ledge. Nimbus did worse with more recovery, and
so did Hoot before the CPU fix. Recovery was only raised where the measurements showed it helped (Clank +23%, Inverta
+7%).

## Results

Best minus worst fighter, in percentage points of win rate:

| Condition | Before: best − worst | After: best − worst | After: best / worst |
|---|---|---|---|
| CPU 9 | 17.2 points | **8.1 points** | 1.18× |
| CPU 9, no ultimates | 23.6 points | **11.1 points** | 1.25× |
| CPU 6 | 21.0 points | **16.0 points** | 1.38× |
| Default rules: 3 stocks, items on, CPU 9 (not tuned on) | 20.8 points | **12.8 points** | 1.30× |
| Average of the three | 16.9 points | **2.5 points** | 1.05× |

Per fighter, sorted from the weakest before. **Avg** is the mean of the three conditions; the last three columns
show each one. A small trim for the strongest ones made room for the buffs.

| Fighter | Win rate before (avg) | After (avg) | CPU 9 | CPU 9 no ults | CPU 6 | Off-bottom deaths / game, before → after | Changes |
|---|---|---|---|---|---|---|---|
| Chef Flambé | 41.3% | **49.8%** | 53.3% | 47.9% | 48.1% | 0.26 → 0.26 | damage +6%, range +5% |
| Vesper | 43.7% | **51.4%** | 53.2% | 51.6% | 49.5% | 0.27 → 0.26 | damage +4%, range +3% |
| Smudge | 44.1% | **49.3%** | 52.3% | 48.3% | 47.2% | 0.19 → 0.20 | damage +4%, range +4% |
| Coral | 44.3% | **50.4%** | 51.3% | 49.3% | 50.5% | 0.26 → 0.24 | damage +5%, range +4% |
| Professor Hoot | 44.6% | **50.6%** | 48.2% | 48.4% | 55.2% | 0.69 → 0.45 | range +1%, recovery +3% |
| Nimbus | 46.5% | **49.0%** | 45.5% | 44.0% | 57.6% | 0.23 → 0.25 | damage −4%, range +10%, weight +20% |
| Sir Clank | 47.5% | **50.1%** | 53.5% | 55.1% | 41.6% | 0.33 → 0.27 | damage −4%, range +11%, recovery +23% |
| Amp | 49.7% | **49.9%** | 53.0% | 47.5% | 49.1% | 0.33 → 0.33 | damage +1%, range +2% |
| Inverta | 50.6% | **49.2%** | 49.6% | 45.1% | 53.0% | 0.52 → 0.60 | damage +2%, range +3%, recovery +7% |
| Kit Cadet | 51.8% | **51.0%** | 47.3% | 53.5% | 52.2% | 0.21 → 0.23 | damage +1%, range +2% |
| Rumble Ruby | 52.1% | **50.2%** | 45.3% | 52.6% | 52.7% | 0.29 → 0.31 | range +2% |
| Granny Grapple | 53.9% | **50.1%** | 51.7% | 52.5% | 46.0% | 0.47 → 0.51 | damage −2%, range +1%, recovery +2% |
| Bouldar | 57.2% | **50.9%** | 50.1% | 52.8% | 49.7% | 0.46 → 0.52 | damage −4%, recovery +1% |
| Echo | 57.2% | **49.6%** | 48.3% | 53.5% | 47.0% | 0.17 → 0.24 | damage −3% |
| Zippy | 57.5% | **49.6%** | 49.2% | 49.7% | 50.0% | 0.30 → 0.39 | damage −2% |
| Tempo | 58.2% | **49.0%** | 48.1% | 48.2% | 50.6% | 0.28 → 0.33 | damage −4% |

Matchups after, CPU 9: how often the row fighter beats the column fighter (50 = even). Each cell is 192 games, so
±7 is noise.

| row beats column (%) | Amp | Bouldar | Chef | Clank | Coral | Echo | Granny | Hoot | Inverta | Kit | Nimbus | Ruby | Smudge | Tempo | Vesper | Zippy |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| **Amp** | — | 51 | 51 | 49 | 69 | 59 | 49 | 57 | 47 | 53 | 51 | 49 | 57 | 51 | 51 | 51 |
| **Bouldar** | 49 | — | 35 | 44 | 48 | 49 | 46 | 48 | 56 | 53 | 60 | 44 | 51 | 61 | 44 | 65 |
| **Chef Flambé** | 49 | 65 | — | 43 | 44 | 64 | 52 | 42 | 55 | 60 | 49 | 58 | 43 | 54 | 70 | 51 |
| **Sir Clank** | 51 | 56 | 57 | — | 52 | 51 | 56 | 60 | 56 | 56 | 53 | 48 | 55 | 63 | 44 | 45 |
| **Coral** | 31 | 52 | 56 | 48 | — | 52 | 54 | 52 | 47 | 55 | 53 | 57 | 47 | 46 | 54 | 66 |
| **Echo** | 41 | 51 | 36 | 49 | 48 | — | 41 | 49 | 43 | 53 | 54 | 55 | 56 | 49 | 46 | 54 |
| **Granny Grapple** | 51 | 54 | 48 | 44 | 46 | 59 | — | 57 | 54 | 48 | 60 | 55 | 48 | 56 | 44 | 49 |
| **Professor Hoot** | 43 | 52 | 58 | 40 | 48 | 51 | 43 | — | 45 | 52 | 58 | 51 | 43 | 42 | 47 | 49 |
| **Inverta** | 53 | 44 | 45 | 44 | 53 | 57 | 46 | 55 | — | 47 | 54 | 62 | 39 | 47 | 44 | 54 |
| **Kit Cadet** | 47 | 47 | 40 | 44 | 45 | 47 | 52 | 48 | 53 | — | 52 | 59 | 51 | 45 | 35 | 45 |
| **Nimbus** | 49 | 40 | 51 | 47 | 47 | 46 | 40 | 42 | 46 | 48 | — | 59 | 46 | 36 | 36 | 48 |
| **Rumble Ruby** | 51 | 56 | 42 | 52 | 43 | 45 | 45 | 49 | 38 | 41 | 41 | — | 46 | 53 | 39 | 41 |
| **Smudge** | 43 | 49 | 57 | 45 | 53 | 44 | 52 | 57 | 61 | 49 | 54 | 54 | — | 55 | 65 | 46 |
| **Tempo** | 49 | 39 | 46 | 38 | 54 | 51 | 44 | 58 | 53 | 55 | 64 | 47 | 45 | — | 35 | 44 |
| **Vesper** | 49 | 56 | 30 | 56 | 46 | 54 | 56 | 53 | 56 | 65 | 64 | 61 | 35 | 65 | — | 55 |
| **Zippy** | 49 | 35 | 49 | 55 | 34 | 46 | 51 | 51 | 46 | 55 | 52 | 59 | 54 | 56 | 45 | — |

## What's left

- **CPU 6: Nimbus 58%, Sir Clank 42%.** Both are within 4 points of 50% at CPU 9, with and without ultimates.
  Nimbus is hard for a slower CPU to catch (four air jumps, light and floaty) and easy for a sharp one to punish.
  Clank is the reverse. Every stat change measured moved all their conditions together, so stats can't close a gap
  that comes from the CPU's skill; shifting them only moved the overshoot from CPU 6 to CPU 9 without ultimates.
  Human players will see a milder version of the same thing: Nimbus is good against beginners.
- **Inverta** still dies off the bottom most (0.60 a game). Her trapeze up-special swings forward, and a CPU
  under the stage can't always get out in time. Her win rate is even (49.2%) without more recovery, and more
  recovery tested worse.
- This is balance for CPU play. Worth checking against real matches once people play online: the results screen
  already records each fighter's wins (Trophies → Statistics).

## Re-running

```powershell
npm run balance
npm run balance -- --seeds 24 --level 6
npm run balance -- --ult off --items 2 --stocks 3 --out balance.json
npm run balance:tune -- --iters 4 --seeds 10 --gain 0.7 --target minimax
```

`balance:tune` rewrites `src/data/balance.ts`. Check the result with `npm run balance` before keeping it.
