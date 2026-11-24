# Smash Your Bros — Design

A 2D platform fighter in the browser, played like the big console platform fighters: damage percent,
knockback that grows with percent, blast zones, stocks, A (attack) and B (special) moves in every direction,
smash attacks, shields, parries, rolls, air dodges, grabs and throws, ledges and teching. Up to four players
online (rollback netcode), any mix with CPU bros. Story campaign (co-op up to 4) and a Classic ladder.
Original cast and world (see ROSTER.md, STORY.md); the tone is affectionate bromance comedy.

Hosted at `https://josephjackman.com/games/smashyourbros/`. Accounts, friends and the online relay are
**Shoallhell's server** (shared accounts; owner's choice).

## 1. Code layout

```
src/sim/       deterministic simulation (the rules). No DOM, no Math.random, no Date, no Math.sin/cos/atan2/pow.
               Floats are fine with + - * / Math.sqrt Math.floor Math.abs Math.min Math.max (IEEE-exact in every
               browser). Trig only through sim/math.ts (dsin/dcos/datan2, deterministic polynomial tables).
src/data/      fighters (one file each), stages, items, story, classic, tasks. Moves are data.
src/render/    canvas renderer: camera, rig drawing, per-fighter art (render/fighters/<id>.ts), stages, effects,
               HUD. Reads state; never writes it.
src/audio/     synthesized sfx, music sequencer, announcer.
src/net/       accounts (Shoallhell API), socket, lobby, rollback session, transport (relay + WebRTC).
src/game/      the match runner (local and online), input: keyboards (input.ts), every gamepad (pads.ts), per-port
               controller layouts (padLayout.ts), the Steam Controller over WebHID, the per-match stats tracker
               (stats.ts), the save (profile.ts), the frame-time overlay (perf.ts).
src/ui/        DOM menus: sign-in, main menu (+ stats panel), character select, rules, lobby/friends, story, classic,
               trophies (achievements, tasks, statistics), settings, results; button prompts (glyphs.ts) and pad
               navigation of every menu (menuPad.ts).
src/flash/     FlashGames mode (§7): the FlashRun SDK (copied unchanged), the run's rules and score (rules.ts), the
               run itself (flashMode.ts).
```

## 2. Simulation conventions (read before writing a fighter)

- 60 frames per second, fixed. `step(state, inputs[])` advances one frame.
- **World units:** about 1 pixel at zoom 1. Fighters stand 90–150 tall. y points **down** (canvas), so
  "up" is negative y in world space. Stages are ~1300 wide; blast zones ~±2200 x, −1800 top, +1300 bottom.
- **Inputs:** stick `x`,`y` in −100..100 with **y positive = up** (stick convention), buttons bitmask
  `ATTACK SPECIAL JUMP SHIELD GRAB TAUNT`, and a `c` (smash stick) direction. Packed into one int
  (`sim/input.ts`) for the network.
- **Controllers (D23):** `readDevice()` turns a keyboard map or a pad into that one int. Pads are read once per
  frame into the standard layout (0 A/✕/B·Nintendo-A, 1 B, 2 X, 3 Y, 4 LB, 5 RB, 6 LT, 7 RT, 8 View, 9 Start, 10/11
  stick clicks, 12–15 D-pad, 16 Guide) whatever the brand; non-standard pads are normalised. Layouts are per player
  port (P1–P4, in the profile): two buttons per action, right stick = smash / tilt / specials / off, deadzone, tap
  jump. A `Device` names its port. Nothing pad-specific ever reaches the sim.
- **Smash vs tilt:** a fresh stick flick (from <30 to ≥80 within 4 frames) + Attack = smash; held direction +
  Attack = tilt; the smash stick (gamepad right stick / keyboard smash key + direction) always smashes on the
  ground and does aerials in the air. Hold Attack during a smash to charge (up to 60 frames, ×1.4 damage).
- **State** is plain JSON-like data (numbers, arrays, small objects) so rollback can clone it. Fighters, moves,
  stages are referenced by index into data tables, never by object.

### Rig and poses (shared by sim and renderer)

Hitboxes and hurtboxes follow the skeleton, so what you see is what hits. Local frame: x = forward (facing),
y = **up**. Every fighter's rig (`RigDef`) gives bone lengths. A `Pose` is a set of angles in degrees:

| field | meaning |
|---|---|
| `rot` | whole-body pitch around the hip; + = top goes forward (front flip: 0→360) |
| `lean` | torso pitch on top of `rot`; + = forward |
| `head` | head nod relative to torso; + = forward/down |
| `armF`,`armB` | upper arm, relative to the torso's "down"; 0 = hanging, 90 = pointing forward, 180 = overhead, −60 = back |
| `foreF`,`foreB` | elbow bend; 0 = straight, + = bends forward/up (flex) |
| `legF`,`legB` | thigh relative to straight down; + = forward (kick), − = back |
| `shinF`,`shinB` | knee bend; 0 = straight, + = shin folds back (natural knee) |
| `wep` | weapon relative to the forearm; 0 = continues the forearm, 90 = points "forward/up" from the fist |
| `tail` | tail relative to the body's down direction; + = toward the back |
| `x`,`y` | hip offset (local units, y up) |
| `sx`,`sy` | squash/stretch (visual only) |

Bones for hitboxes: `hip torso neck head shoulder elbowF handF elbowB handB kneeF footF kneeB footB wep wepMid
tail`. "F" = front (near the camera, drawn on top), "B" = back.

Move animations are keyframes `[frame, poseName | partial pose, ease?]`, poses from the shared library in
`sim/poses.ts` (fighters may add their own).

### Moves

Balance multipliers (damage, range, recovery, weight) sit on top of the move data in `src/data/balance.ts`
(D25, `docs/BALANCE.md`).


Every fighter has: `jab1 jab2 jab3 (or jabR rapid) ftilt utilt dtilt dash fsmash usmash dsmash nair fair bair
uair dair nspec sspec uspec dspec grab dashgrab pummel fthrow bthrow uthrow dthrow ledgeatk getupatk ult`.
A move is data (`sim/types.ts` `MoveDef`): total frames, hitboxes with active frames, bone, offset, radius,
damage, angle, base knockback, knockback growth; velocity keys, landing lag, auto-cancel, armour, intangibility,
projectiles, charge, chains, counters, reflectors, command grabs, and an optional deterministic `script` for
special behaviour.

- **Knockback:** `KB = ((((p/10 + p·d/20) · 200/(w+100) · 1.4) + 18) · kbg/100) + bkb` (p = target percent
  after the hit, d = damage, w = weight). Launch speed = KB × 0.27 units/frame, decaying 0.46/frame; hitstun =
  KB × 0.4 frames; tumble above KB 80. Angle 361 = the "auto" angle (low and flat on the ground at low knockback,
  ~40° in the air). DI: holding perpendicular to the launch bends it up to 18°.
- **Hitlag** both sides: `floor((d·0.65 + 6) · mult)`, max 30; SDI nudges during it.
- **Shield** 50 HP, −0.15/frame held, +0.08/frame regen; break → dizzy. **Parry**: a hit in the first 5 frames
  after pressing shield (no shieldstun, attacker gets punished). Out of shield: jump, up-B, up-smash, grab.
- **Teching:** press shield within 11 frames before hitting the floor/wall/ceiling in tumble (40-frame lockout
  after a press). Neutral = tech in place, left/right = tech roll. Missed tech = knockdown, then get-up options.
- **Ledges:** auto-grab when near a ledge corner and not rising; intangibility on grab (less each regrab
  without landing); getup, jump, roll, attack, drop. A second fighter grabbing an occupied ledge pops the first
  off (trump).
- **Jumps:** 3-frame jumpsquat; release before it ends (or press Jump+Attack together) = short hop. Air jumps per
  fighter. Fast fall: tap down while falling. Soft platforms: tap down to drop through.
- **Air dodge:** directional; one per airtime.

## 3. Modes, rules and modifiers

Modes: Stock, Time, Stamina, Coin battle, King of the Hill. Teams (2v2) any mode. Items off/low/medium/high.
Ultimates: off / meter (fills by dealing and taking damage) / orb (a floating orb you break).
Modifier families (stack freely, presets in `src/data/modifiers.ts`):
- Physics: low gravity, heavy gravity, ice floors, wind gusts, bouncy side walls, turbo (cancel on hit).
- Body: giant, tiny, glass cannon, invisible, body swap every 30 s, mirror match.
- Arena: rising lava, shrinking blast zones, meteor shower, topsy-turvy camera, blackout, item rain.
- Rules: bounty on the leader, hot-potato bomb, sudden ultimates, Live Studio Audience (random twist every 25 s).

## 4. Online

Lobby on Shoallhell's server (4-digit room codes, friend list with presence and invites, friend codes).
Everyone runs the same deterministic simulation; only inputs travel. Rollback: 2-frame input delay, up to 10
frames of prediction, inputs re-sent with redundancy; transport = WebRTC data channels between players
(signalled through the server) with the server relay as fallback. CPU bros are simulated identically on every
machine. A player who drops for >8 s can be replaced by a CPU at an agreed frame.

## 5. Menus and controllers

Every screen must be drivable by pad and keyboard (`ui/menuPad.ts`): clickable non-buttons get `tabindex="0"`
(and `role="button"`), the screen's Back / Close button `data-back` (B, Escape), its main action
`data-pad-start` (Start), a secondary one `data-pad-view` (View); tabs are `.tabs [data-tab]` (LB / RB); a
control that wants X / Y listens for `pad-x` / `pad-y`. A screen with its own pad logic (the picker's per-player
cursors) uses `setPadHandler`. Button prompts come from `ui/glyphs.ts` (`glyphEl`, `hintBar`,
`{action}` templates) so they follow the device in use and the current bindings. Text entry (email, password,
names) is the one keyboard-only thing; codes have an on-screen number pad.

## 6. Presentation

Bold vector cartoon: thick dark outlines, flat colour with one shade, squash and stretch, big readable
silhouettes. Hit sparks per element, hitlag shake, screen shake, launch smoke trails, the coloured KO blast at
the blast zone, slow-motion zoom on the game-winning hit, off-screen magnifier bubbles, the percent shaking and
heating from white to deep red. Synthesized sfx, a sequencer for stage music, an announcer (speech synthesis,
optional).

Performance rules (D22): no canvas `filter` or `shadowBlur` in anything drawn per frame (tint through
`drawWashed`'s colour wash, glow with wide faint strokes); no full-screen gradient re-shaded per frame (cache the
layer or a sprite); reset to screen space with `screenT(c)`, never `setTransform(1,0,0,1,0,0)` (the backing store
is scaled by the adaptive resolution); effects and animation advance on the 60 Hz clock, not per drawn frame; the
match draws only when the sim advanced. Check with `?fps`.

## 7. FlashGames mode

FlashGames (`josephjackman.com/games/flashgames/`) is a daily 15-minute speedrun that rotates through the owner's
single-player games: each day (midnight US Central) the server picks a game, a seed and 2–3 of its modifiers, and
everyone plays the same run. The contract is `docs/PROTOCOL.md` in the FlashGames repo
(`roamingjackmans-pixel/flashgames`); Smash Your Bros's side is D27.

- **Boot.** `src/flash/flash-run.js` (the SDK, copied unchanged with its `.d.ts`) is imported first by `main.ts`
  and sets `window.FlashRun`. With `?flash=<code>` the page boots `src/flash/flashMode.ts` instead of the app: no
  sign-in, menus, save, profile, tasks, stats, achievements, socket or server, ever (the run is in memory; only the
  device's volume and graphics settings are read). Without `?flash` nothing changes.
- **The run** is the Classic ladder solo against CPUs: rounds 1–7, Max Ratings, The Big BROadcast (with its
  stagehands). Your fighter is `FlashRun.rng('fighter')` over all 16 (unlocks don't matter); each loop's foes and
  stages come from `classicRounds(fighter, seed)` with `rng('ladder:<loop>')`, each match's seed from
  `rng('match:<loop>:<round>:<phase>')`, so everyone gets the same ladder. Intensity 3 (Classic's default; CPUs +1
  from round 7 as in Classic); after the camera a new seeded ladder starts at intensity 6, then 9. Losing a fight
  ends the run (`FlashRun.over(score, detail, 'dead')`, sent at the KO; the replay plays behind the card). Items
  low, ultimates on the meter, hazards off, as in Classic.
- **Start and end.** The first match is built and drawn, then held until `await FlashRun.ready()` resolves (the
  first fight skips the in-game countdown: FlashGames has just counted). Between fights a card shows the points for
  1.7 s (3 s around the host). `FlashRun.onEnd` stops the match where it stands (no more simulation or input) and
  shows the final card.
- **Controls.** The default P1 keyboard and every connected pad at once, with default layouts (the profile's
  bindings are part of the save). Pads are read directly, so they work while the page around the iframe has the
  focus; the game takes the keyboard focus on load and on click. Tap jump follows the device in use. No pause.
- **Score** (`FlashScore`, only ever adds; `FlashRun.score` on every change): each round won 1,000 + 250 per stock
  left + 10 per whole second under 2:00 (simulated time from GO); Max Ratings +2,000, The Big BROadcast +3,000; each
  KO you score 100 (stagehands 25). Everything × the loop number. A strong CPU-played loop scores ~25,000;
  `maxScore` (the server's sanity cap) is 2,000,000.
- **HUD.** A DOM layer `#flash` outside `#ui` (anything in `#ui` counts as a menu, and menus swallow pad buttons):
  score and detail top left, the day's modifiers top right (with their text for the first seconds), the cards.
  Both corners step down during the camera fight, out of its HP bar. No 15-minute timer (FlashGames shows it).
- **Modifiers** (ids are stable: old days' plans refer to them). The sim ones are `MOD_IDS` appended after the
  lobby's, so nothing else moves:

| id | name | does |
|---|---|---|
| `moon` | Moon Bros | sim `lowgrav` |
| `bighead` | Big Head Mode | sim `bighead`: heads ×2 from the neck, head hurtbox ×2 (`Skel.hs`) |
| `tiny` | Pocket Bros | sim `tiny` (excludes `giant`) |
| `giant` | Protein Shake Night | sim `giant` (excludes `tiny`) |
| `fast` | Fast Forward | `Match.speed` 1.5: 90 simulated frames a second |
| `triple` | Glass Jaws | sim `triple`: every hit's damage ×3 (moves, projectiles, items, hazards); the camera's HP ÷3 |
| `launch` | Launch Party | sim `launch`: knockback ×2 |
| `onestock` | One and Done | 1 stock for everyone (excludes `triple`, `launch`, `hardest`) |
| `monsoon` | Item Monsoon | items high + sim `itemrain` |
| `mirror` | Mirror, Mirror | every foe and ally is your fighter; Max stays Max |
| `shuffle` | Identity Crisis | a seeded random fighter every round (`rng('fighter:<loop>:<round>')`) |
| `hardest` | Bro-pocalypse | CPUs at level 9 every loop |
| `vampire` | Second Wind | sim `vampire`: a KO by a human resets their damage to 0% |
| `noshield` | Shields Down | sim `noshield`: the shield never comes up (rolls, spot dodges, air dodges, techs still work) |
| `shrink` | Shrinking Studio | sim `shrink` |
| `lava` | The Floor Is Lava | sim `lava` |

- **flash.json.** `public/flash.json` (copied to `dist/`) is `FLASH_INFO` in `src/flash/rules.ts`;
  `tests/flash.test.ts` fails if they differ (`WRITE_FLASH_JSON=1 npx vitest run tests/flash.test.ts` rewrites it).
  The tests also check each modifier's effect and play every allowed combination of 1–3.
- **Trying it.** `node <FlashGames>/sdk/make-flash-url.mjs moon,bighead 12345 120` prints a `?flash=` code; open
  `http://localhost:5175/games/smashyourbros/?flash=<code>` (`npm run dev:client`; no server needed) or the built
  `dist` served at `/games/smashyourbros/`. On its own the run starts a second after `ready()` and ends after the
  limit. `window.sybFlash` holds the live run (match, fight, score) for browser checks.
