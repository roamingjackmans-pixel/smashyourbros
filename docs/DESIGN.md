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
