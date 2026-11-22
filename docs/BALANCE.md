# Balance report

The owner asked on 2026-11-21 to make all 16 fighters' win rates roughly the same, within 15% of each other, by
giving the weaker ones more attack range, more damage and a better way back to the stage. Decision: D25. Measured
on build 1.0.5 (before) and this change (after). Re-measured after D26 made CPU levels 7–9 hit harder and level 1
easy (see *CPU levels* and *Re-measured after D26*).

## Result

Every fighter's **overall win rate is now between 48.4% and 52.1%**. That's a 3.6-point spread, with the best only
1.08× the worst; before it was a 16.9-point spread, from 41.3% to 58.2%. Fighters also stay within 15 points of each
other in each separate condition below, the default rules included, except one: with mid-level CPUs (CPU 6), Nimbus
and Sir Clank still sit 16 points apart (see *What's left*).

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
CPU 9, 24 seeds.

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

## Re-measured after D26

D26 made the CPU levels spread out: level 1 is now easy and level 9 much harder. Levels 6–9 kept their tactics, and
`src/sim/cpu.ts` makes level 9 deal 22% more damage and take 12% less knockback. In a balance match both CPUs are
level 9, so this is even for both sides, but it changes how matches go: heavier hits early, and fewer deaths off the
bottom. Bouldar rose to 53% and Coral and Echo fell to 48%, so Bouldar's damage went down 1.7% and Coral's and Echo's
up 1.4%. All the figures below are from after that.

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
| CPU 9 | 17.2 points | **9.5 points** | 1.21× |
| CPU 9, no ultimates | 23.6 points | **13.7 points** | 1.31× |
| CPU 6 | 21.0 points | **15.9 points** | 1.37× |
| Default rules: 3 stocks, items on, CPU 9 (not tuned on) | 20.8 points | **14.5 points** | 1.32× |
| Average of the three | 16.9 points | **3.6 points** | 1.08× |

Per fighter, sorted from the weakest before. **Avg** is the mean of the three conditions; the last three columns
show each one. A small trim for the strongest ones made room for the buffs. Off-bottom deaths are the mean of the
three conditions; some of the drop comes from level 9 now taking less knockback (D26), which helps everyone.

| Fighter | Win rate before (avg) | After (avg) | CPU 9 | CPU 9 no ults | CPU 6 | Off-bottom deaths / game, before → after | Changes |
|---|---|---|---|---|---|---|---|
| Chef Flambé | 41.3% | **48.9%** | 51.1% | 47.5% | 48.2% | 0.26 → 0.23 | damage +6%, range +5% |
| Vesper | 43.7% | **52.1%** | 54.5% | 51.3% | 50.5% | 0.27 → 0.22 | damage +4%, range +3% |
| Smudge | 44.1% | **50.0%** | 55.3% | 46.8% | 47.9% | 0.19 → 0.17 | damage +4%, range +4% |
| Coral | 44.3% | **48.8%** | 48.7% | 46.8% | 50.8% | 0.26 → 0.23 | damage +6%, range +4% |
| Professor Hoot | 44.6% | **50.2%** | 46.5% | 49.0% | 55.1% | 0.69 → 0.40 | range +1%, recovery +3% |
| Nimbus | 46.5% | **49.2%** | 45.8% | 43.6% | 58.2% | 0.23 → 0.21 | damage −4%, range +10%, weight +20% |
| Sir Clank | 47.5% | **51.4%** | 54.5% | 57.3% | 42.3% | 0.33 → 0.24 | damage −4%, range +11%, recovery +23% |
| Amp | 49.7% | **49.2%** | 49.8% | 48.7% | 48.9% | 0.33 → 0.29 | damage +1%, range +2% |
| Inverta | 50.6% | **49.4%** | 49.0% | 46.4% | 52.8% | 0.52 → 0.52 | damage +2%, range +3%, recovery +7% |
| Kit Cadet | 51.8% | **50.9%** | 47.6% | 53.3% | 51.8% | 0.21 → 0.20 | damage +1%, range +2% |
| Rumble Ruby | 52.1% | **51.9%** | 48.3% | 53.9% | 53.5% | 0.29 → 0.26 | range +2% |
| Granny Grapple | 53.9% | **51.4%** | 53.7% | 54.4% | 46.0% | 0.47 → 0.46 | damage −2%, range +1%, recovery +2% |
| Bouldar | 57.2% | **50.1%** | 50.6% | 53.6% | 46.1% | 0.46 → 0.46 | damage −6%, recovery +1% |
| Echo | 57.2% | **49.1%** | 48.9% | 50.7% | 47.7% | 0.17 → 0.22 | damage −2% |
| Zippy | 57.5% | **49.1%** | 48.0% | 49.4% | 49.8% | 0.30 → 0.34 | damage −2% |
| Tempo | 58.2% | **48.4%** | 47.6% | 47.4% | 50.3% | 0.28 → 0.29 | damage −4% |

Matchups after, CPU 9: how often the row fighter beats the column fighter (50 = even). Each cell is 192 games, so
±7 is noise.

| row beats column (%) | Amp | Bouldar | Chef | Clank | Coral | Echo | Granny | Hoot | Inverta | Kit | Nimbus | Ruby | Smudge | Tempo | Vesper | Zippy |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| **Amp** | — | 51 | 52 | 48 | 52 | 52 | 46 | 47 | 48 | 53 | 41 | 42 | 55 | 56 | 52 | 54 |
| **Bouldar** | 49 | — | 42 | 39 | 43 | 55 | 42 | 56 | 63 | 55 | 62 | 45 | 40 | 58 | 50 | 60 |
| **Chef Flambé** | 48 | 58 | — | 56 | 48 | 50 | 48 | 52 | 56 | 49 | 37 | 53 | 39 | 57 | 68 | 49 |
| **Sir Clank** | 52 | 61 | 44 | — | 59 | 55 | 52 | 63 | 51 | 59 | 58 | 56 | 51 | 65 | 46 | 46 |
| **Coral** | 48 | 57 | 52 | 41 | — | 45 | 42 | 53 | 50 | 43 | 54 | 58 | 37 | 44 | 43 | 64 |
| **Echo** | 48 | 45 | 50 | 45 | 55 | — | 46 | 44 | 48 | 53 | 56 | 51 | 42 | 51 | 41 | 58 |
| **Granny Grapple** | 54 | 58 | 52 | 48 | 58 | 54 | — | 61 | 55 | 51 | 63 | 51 | 51 | 59 | 41 | 47 |
| **Professor Hoot** | 53 | 44 | 48 | 37 | 47 | 56 | 39 | — | 49 | 44 | 59 | 51 | 36 | 38 | 45 | 50 |
| **Inverta** | 52 | 38 | 44 | 49 | 50 | 52 | 45 | 51 | — | 54 | 51 | 59 | 42 | 46 | 51 | 52 |
| **Kit Cadet** | 47 | 45 | 51 | 41 | 57 | 47 | 49 | 56 | 46 | — | 51 | 44 | 60 | 45 | 36 | 39 |
| **Nimbus** | 59 | 38 | 63 | 42 | 46 | 44 | 37 | 41 | 49 | 49 | — | 55 | 41 | 38 | 34 | 51 |
| **Rumble Ruby** | 58 | 55 | 47 | 44 | 42 | 49 | 49 | 49 | 41 | 56 | 45 | — | 47 | 56 | 43 | 43 |
| **Smudge** | 45 | 60 | 61 | 49 | 63 | 58 | 49 | 64 | 58 | 40 | 59 | 53 | — | 56 | 59 | 57 |
| **Tempo** | 44 | 42 | 43 | 35 | 56 | 49 | 41 | 63 | 54 | 55 | 63 | 44 | 44 | — | 36 | 46 |
| **Vesper** | 48 | 50 | 32 | 54 | 57 | 59 | 59 | 55 | 49 | 64 | 66 | 57 | 41 | 64 | — | 64 |
| **Zippy** | 46 | 40 | 51 | 54 | 36 | 42 | 53 | 50 | 48 | 61 | 49 | 57 | 43 | 54 | 36 | — |

## CPU levels

The owner asked for level 1 to be very easy and level 9 really hard (D26). `npm run balance -- --ladder` plays CPU
levels against each other: each fighter against three others, both sides, four stages, 9 seeds; 288 games per
pairing, 2 stocks. "Lower level wins" is how often the weaker CPU takes the match.

| Match-up | Lower level wins | Lower level falls / game | Higher level falls / game | Match length |
|---|---|---|---|---|
| Level 1 vs level 2 | 1.0% | 1.95 | 0.17 | 2:36 |
| Level 2 vs level 3 | 2.4% | 1.96 | 0.24 | 1:50 |
| Level 3 vs level 4 | 16.3% | 1.82 | 0.83 | 1:51 |
| Level 4 vs level 5 | 39.2% | 1.55 | 1.24 | 1:50 |
| Level 5 vs level 6 | 35.1% | 1.59 | 1.18 | 1:50 |
| Level 6 vs level 7 | 38.9% | 1.55 | 1.24 | 1:47 |
| Level 7 vs level 8 | 32.6% | 1.60 | 1.11 | 1:38 |
| Level 8 vs level 9 | 30.9% | 1.61 | 1.14 | 1:32 |
| Level 1 vs level 3 | 0.0% | 2.00 | 0.03 | 1:34 |
| Level 1 vs level 5 | 0.7% | 1.99 | 0.07 | 1:12 |
| Level 3 vs level 6 | 6.6% | 1.93 | 0.50 | 1:36 |
| Level 5 vs level 9 | 11.5% | 1.87 | 0.67 | 1:24 |
| Level 6 vs level 9 | 16.7% | 1.78 | 0.82 | 1:29 |
| Level 1 vs level 9 | 1.7% | 1.98 | 0.13 | 0:57 |

Every level beats the one below it. Level 1 rarely takes a stock: it walks, wanders, only uses light attacks
and never shields, so the 1-vs-2 matches run long while level 2 picks it apart. Levels 1–3 are for beginners and
children, and the steps from 4 to 9 are gentler, each one winning about 60–70% against the one below. Each cell
is ±3 points of noise.

## What's left

- **CPU 6: Nimbus 58%, Sir Clank 42%.** At CPU 9, Nimbus is a little low (46%, 44% without ultimates) and Clank
  a little high (55%, 57%). Nimbus is hard for a slower CPU to catch (four air jumps, light and floaty) and easy for a
  sharp one to punish. Clank is the reverse. Every stat change measured moved all their conditions together, so
  stats can't close a gap that comes from the CPU's skill; shifting them only moved the overshoot from CPU 6 to CPU
  9 without ultimates. Human players will see a milder version of the same thing: Nimbus is good against beginners.
- **Default rules: Vesper and Smudge 60%.** With items on and 3 stocks they do best, and Rumble Ruby, Kit Cadet and
  Bouldar worst (45–46%). That's a 14.5-point spread, inside 15, but it's the condition the tuning never saw.
- **Inverta** still dies off the bottom most (0.52 a game). Her trapeze up-special swings forward, and a CPU
  under the stage can't always get out in time. Her win rate is even (49.4%) without more recovery, and more
  recovery tested worse.
- This is balance for CPU play. Worth checking against real matches once people play online: the results screen
  already records each fighter's wins (Trophies → Statistics).

## Re-running

```powershell
npm run balance
npm run balance -- --seeds 24 --level 6
npm run balance -- --ult off --items 2 --stocks 3 --out balance.json
npm run balance -- --ladder --seeds 9
npm run balance:tune -- --iters 4 --seeds 10 --gain 0.7 --target minimax
```

`balance:tune` rewrites `src/data/balance.ts`. Check the result with `npm run balance` before keeping it.
