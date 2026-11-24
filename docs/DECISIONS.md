# Decisions

Newest last. Each: what, why.

- **D1 (owner, 2026-11-20)** Scope from the owner's answers: platform fighter played like the console ones;
  original 16-fighter cast (12 classic roles + 4 new mechanics; 4 open, rest unlocked by tasks); bold vector
  cartoon art; story "Prime-Time Brawl"; Story campaign + Classic ladder; items + ultimates; all four modifier
  families; 4 stages; online up to 4; accounts and friends shared with Shoallhell; build everything, then deploy.
- **D2 (owner, 2026-11-20)** Tone: very funny bromance — fighters hype, compliment and flirt with their bros.
  Kept PG and affectionate: the joke is sincere over-the-top bro love, never anyone's identity. "Bro" is any
  gender. The host's camera becomes The Big BROadcast and the show runs on bro-energy.
- **D3** No Nintendo characters, names, stages, music or art: the owner asked for "the smash bros characters";
  they are copyrighted, so every fighter is an original design that fills a familiar role. Mechanics (percent,
  knockback, smash attacks, shields, teching, ledges) are genre conventions and are implemented as described.
- **D4** Tech: Vite + TypeScript + Canvas 2D, no framework, like Shoallhell (the other game on the same server),
  built to `site/` on the `ready` branch for the games repo.
- **D5** Deterministic simulation in floats restricted to IEEE-exact operations (+ − × ÷ sqrt floor) plus
  table-based trig in `sim/math.ts`. Simpler to author than integer fixed point and identical across browsers.
- **D6** Hitboxes and hurtboxes are attached to the skeleton (forward kinematics in the sim), so the art and
  the boxes cannot drift apart. The renderer draws from the same pose evaluation plus visual-only extras.
- **D7** Stage collision uses axis-aligned rectangles (stacked to taper the underside) plus soft platforms,
  which is robust under rollback; the art draws a smooth hull over them.
- **D8** Shared accounts: Smash Your Bros reads Shoallhell's sign-in token (`shoallhell.token`, same origin on
  josephjackman.com), calls Shoallhell's API under `/games/shoallhell/api`, and keeps its own save at
  `/syb/profile` (`profiles/syb/<id>.json`). Rooms and presence carry a `game` so friend lists show which game
  a friend is in.
- **D9** Parry = a hit landing within 5 frames of pressing shield (not on release): easier on keyboards.
- **D10** Tap-jump defaults: off on keyboard (W is "up", Space jumps), on for gamepads; per player in Settings.
- **D11** Rollback for 4: 2-frame input delay (1–4 in Settings), up to 10 predicted frames, a missing player's
  last input repeats as the prediction, inputs re-sent with ~15 frames of redundancy. WebRTC data channels
  (unordered, no retransmits) between every pair, signalled through the server; the server relay always carries
  inputs too (every frame until every direct channel is open, then every third frame), so a blocked direct
  connection only costs latency. Time sync: whoever runs ahead waits a few frames (GGPO-style advantage swap).
- **D12** Desync repair: every 120 frames a checksum of a fully confirmed frame is shared; on a mismatch the host
  sends that frame's state and the others adopt it and replay. A player stalled for 8 s becomes a CPU from the
  first frame everyone is missing (all machines roll back to it and apply the same change).
- **D13** CPUs run inside the simulation with stateless per-frame randomness (a hash of frame, slot and seed) and
  their memory in `f.bm`, so they cost no network and play identically everywhere.
- **D14** Multi-hit re-hits count the attacker's move frames, not global frames: otherwise hitlag freezes the move
  while the re-hit timer runs, and a 4-hit up-B became a 40-hit lock.
- **D15** Grounded normals stop at stage edges (teeter) instead of sliding off; specials may still carry you off.
- **D16** The final hit of a match replays in slow motion with a zoom (presentation only: the last ~100 states are
  cloned each frame and replayed), then GAME!.
- **D17** The menus sit on top of a live CPU match on a random stage (attract mode).
- **D18** New contestants: finishing a task queues a "NEW CONTESTANT APPEARS!" 1-stock fight after the results
  screen; losing keeps them in Contestants for a rematch.
- **D19** Story co-op works locally (up to 4 on one device) and online (the lobby's "Story co-op" activity; each
  player's own progress is saved).
- **D20** `/games/SmashYourBros/` (as the owner typed it) redirects to `/games/smashyourbros/`, matching the other
  games' lowercase folders; both work.
- **D21** Stage hazards (toggle in Rules): a falling stage light (Studio), a falling neon sign (Rooftops), a
  cannonball from offscreen (Galleon), drifting debris (Orbit). Off in story and Classic objectives.
- **D22 (owner: "the frame rate drops a ton regularly")** Measured first, on the owner's laptop: the game ran on the
  Intel iGPU (hybrid graphics; browsers default to it) at 2560×1600 on a 120 Hz screen. Headless Chromium pinned to
  that GPU, 4-CPU matches and the menus: 23–37 fps with stalls of 0.3–1.2 s; game code was only ~1 ms a frame and
  GC/cloning negligible (state 6 kB, `structuredClone` 0.03 ms, so the final-hit replay history stays), so it was all
  GPU raster. Causes and fixes: (1) **canvas `filter`** on the hit flash, star power, frozen fighters and locked
  roster silhouettes — Chrome renders every path under it through its own full-canvas layer (one flashing fighter
  cost up to a second); replaced by drawing the fighter into a scratch canvas the size of its box and washing it with
  `source-atop` (995 ms → 13 ms worst case in a read-back test, then nothing measurable). (2) Full-screen gradients
  re-shaded every frame (≈20× a flat fill): sky layers are cached per screen size, the studio spotlights, the orbit
  planet, the KO beam and explosions are cached sprites. (3) `shadowBlur` glows (stagehands, Zippy) are wide faint
  strokes. (4) Everything was drawn on every display refresh: the match draws only when the sim advanced, effects /
  animation time / percent shake / the replay run on a 60 Hz clock (they ran double speed at 120 Hz), menu portraits
  are time-based, sleep off-screen and cap at 1.5 px/px, the locked-tile CSS grayscale filter is gone, HUD portraits
  are cached. (5) **Resolution:** the match canvas draws in logical pixels (CSS × DPR ≤ 2, so the HUD looks as
  before) with an adaptive backing scale (`render/quality.ts`): Auto caps at 2560×1600 and steps down 0.1 (to 0.5)
  when ≥3 of 45 frames are late (>25 ms), back up after 6 s on time (not to a failed level within 30 s); Sharp = full,
  Fast = 720p budget; the attract match behind menus caps at 0.6. Graphics quality is per device (localStorage).
  Result, same GPU and size: 60.0 fps everywhere, worst frame 16.8 ms, 0 late frames, matches at full 2560×1600.
  `?fps` (or Settings → Graphics) shows a frame-time overlay (fps, p50/p95/worst, late frames, game-code ms, canvas
  size).
- **D23 (owner: "work well with controllers the way DungeonJoe does")** Ported DungeonJoe's approach: one pad poller
  (`game/pads.ts`) reads every controller once per frame into the standard layout; button prompts drawn in code
  (`ui/glyphs.ts`); menus driven by the pad (`ui/menuPad.ts`); DungeonJoe's Steam Controller WebHID driver unchanged
  (`game/steamController.ts`). Beyond DungeonJoe: **Switch Pro / Joy-Con** (Switch pictures; "Nintendo labels" on by
  default swaps A/B and X/Y so the button *labelled* A is A, confirming like the console), **generic / non-standard**
  pads (buttons as listed, a hat switch or axes 6/7 become the D-pad, right stick from DirectInput Z/Rz; generic
  pictures show which face position), **several pads at once** (DungeonJoe is one player). Layouts are **per player
  port P1–P4** in the profile (`settings.pads`): every action rebindable to two buttons with DungeonJoe's swap rule,
  the right stick as smash stick / tilt stick / specials stick / off (a flick reads as direction + Attack at 52, under
  the smash and tap-jump thresholds, or direction + Special at 75, for 3 frames), deadzone, tap jump (the old single
  gamepad tap-jump setting migrates). Menu confirm / back are one pair for everyone. `readDevice()` still returns the
  same `pack(x, y, b, c)` int: the sim and netcode are untouched. Menus: every clickable tile is focusable, the focus
  ring shows under pad / arrow keys, Back buttons carry `data-back`, a screen's main action `data-pad-start`
  (Start), Rules `data-pad-view` (View); a button a menu used is swallowed until released, so it never leaks into a
  match. The character picker gives each pad its own cursor (A pick, X/Y colour, B leave, View for the shared menu,
  Start fight); a new pad joins with A or Start into the first free port (a keyboard idle for 15 s gives up P1);
  P1 starts on whichever device was used last. Hot-plug toasts; unplugging a player's pad pauses a local match.
  Rumble on hits (both bros), KOs, parries, shield breaks and ultimates, strength Off / Gentle / Full (DungeonJoe has
  none). Lobby and friend codes get an on-screen number pad. Still keyboard-only: typing an email/password and
  renaming (text entry).
- **D24 (owner: "statistics and achievements on the home screen")** Lifetime stats extend the existing
  `profile.stats` (matches and wins per mode, time in matches, damage taken, hits, best KOs / damage in a match,
  flawless and team wins, modes and stages played) plus what a presentation-side `MatchTracker` sees per match
  (longest combo = hits while the victim never got to act, combos of 3+, moves used → favourite move, taunts); it
  never touches the sim and skips rollback re-simulated frames. Classic rounds and challenger fights now count too
  (they had no results screen). 47 achievements (`data/achievements.ts`, bro-tone names) with progress bars and
  unlock toasts; earned-before-they-existed ones are granted quietly at sign-in with one toast. The twelve unlock
  tasks stay as they were and show on the Trophies screen beside the achievements. Home screen: a stats panel beside
  the tiles (favourite bro, signature move, 9 numbers, recent results, latest and next achievement) and a TROPHIES
  tile (Achievements / Unlock tasks / Statistics tabs). A full save stays well under the server's 400 kB profile
  limit (test: < 40 kB), so the server is unchanged.
- **D25 (owner: "make all 16 characters' win rates roughly the same… within 15% of each other")** Measured with
  `npm run balance` (new: a parallel CPU round robin: every pairing, both sides, all stages, many seeds) in three
  conditions: CPU 9, CPU 9 without ultimates, CPU 6. Found and fixed a CPU bug first: during an up-special the CPU
  steered at its opponent instead of the ledge, so drifting recoveries drifted the wrong way and Hoot's aimed
  teleport went straight up (he died off the bottom twice as often as anyone); CPUs now steer for the ledge, aiming
  moves marked `aim` straight at it. Balance lives in one table, `src/data/balance.ts`, applied when the fighters load:
  damage (`power`), range (hitbox radius and forward offset, grabs, projectile hitboxes), recovery (up-special lift and
  drift, half on air jump and air speed; Hoot's teleport speed) and weight. Tuned by `npm run balance:tune` (damped
  steps toward 50%), Sir Clank and Nimbus by hand from one-knob experiments. Result: every fighter's overall win rate is
  49.0–51.4% (was 41.3–58.2%); per condition the best-minus-worst spread is 8.1 / 11.1 / 16.0 points (was 17.2 /
  23.6 / 21.0) and 12.8 on the default rules, which weren't tuned on (was 20.8). The one gap over 15 is CPU 6, where
  Nimbus (58%) and Clank (42%) depend on the CPU's skill, not their stats. Full report: `docs/BALANCE.md`.
- **D26 (owner: "you can't change the AI's character or level from a controller… make level 1 easy and level 9
  really hard")** Character select by pad: each pad's cursor picks for a *target* slot, its own by default. LB / RB
  cycle the target through the CPU slots and empty slots ("+CPU": picking there adds a CPU), A picks the fighter,
  X / Y the colour, LT / RT the CPU's level, B returns to your own slot; the cursor's badge says who it's picking for
  ("P1 → CPU"). The Random tile now shows cursors (the tag-strip loop skipped it), down from any column reaches it,
  and cursors have a white inner ring so they read on any tile. Difficulty: one skill table per level in
  `sim/bot.ts`. Levels 1–5 got weaker tactics (level 1 wanders, walks, only uses light attacks, never shields, techs
  or DIs, recovers late); levels 6–9 keep the old tactics exactly, so balance measured at 6 and 9 carries over, and
  `sim/cpu.ts` scales damage dealt (level 1 ×0.8 … level 9 ×1.22) and knockback taken (×1.1 … ×0.88); bosses and
  stagehand fodder are exempt. Smarter top-level tactics (last-moment shields that parry, combo follow-ups) were
  tried first and dropped: they made level 9 stronger, but much more for swords and grabbers than for light fighters,
  and broke the balance. Measured with `npm run balance -- --ladder`: every level beats the one below (level 2 beats
  1 99% of the time, 9 beats 8 69%), level 9 beats level 6 83% and level 5 88% of the time, and level 1 wins under 2%
  against anyone. Story enemies were mapped onto the new curve so the story plays as before (3→4, 4→5, Max Ratings'
  level-8 fight →7). Balance re-measured, since a harder level 9 changes how CPU-9 matches go: Bouldar's damage −1.7%,
  Coral's and Echo's +1.4%; spreads 9.5 / 13.7 / 15.9 points (CPU 9 / no ultimates / CPU 6) and 14.5 on the default
  rules; every fighter's average 48.4–52.1%. `docs/BALANCE.md` has the ladder.
- **D27 (owner: "add a FlashGames mode")** Smash Your Bros joins FlashGames, the daily 15-minute seeded speedrun
  (FlashGames repo `docs/PROTOCOL.md`; DESIGN §7). The run is the Classic ladder solo against CPUs because it is the
  game's single-player campaign with an end (Story is co-op and scripted). Choices: the fighter from
  `FlashRun.rng('fighter')` over all 16 (unlocks are save data); `classicRounds` takes an optional seed so each loop's
  foes and stages come from the day's seed (no seed = the old per-fighter ladder, unchanged); intensity 3, Classic's
  default, since one lost round ends the run and friends of every skill compare scores; after the camera a fresh
  ladder at 6, then 9, with every point multiplied by the loop, so the 15 minutes never run dry. Losing a round
  ends the run (protocol: `over(…, 'dead')`), sent at the KO so a closed tab can't lose it; the slow-motion replay
  still plays behind the card. Score: wins, stocks left and speed per round, host bonuses, KOs as they happen (100;
  stagehands 25 so farming them never beats finishing), all × loop; whole numbers that only add. 16 modifiers: the
  ones the sim already had (low gravity, tiny, giant, item rain, shrinking blast zones, lava) plus five new sim
  modifiers appended to `MOD_IDS` (`noshield`, `bighead`, `triple`, `launch`, `vampire`; appended so the lobby's bit
  flags never move, and only FlashGames turns them on) and run-level ones (1.5× game speed through `Match.speed`,
  one stock, mirror foes, a fighter per round, CPU 9). Big Head Mode also doubles the head hurtbox, so it changes
  play, not just the look. Excluded pairs: tiny/giant (contradictory) and One and Done with triple damage, double
  knockback or CPU 9 (a run that ends in seconds for most players). Controls are the default keyboard plus every pad
  with default layouts (bindings live in the save); pads are read even while the page around the iframe has the
  focus. The HUD is its own layer outside `#ui`, because anything in `#ui` is treated as a menu and swallows pad
  buttons. Normal mode is unchanged: every new branch is behind a FlashGames-only modifier or `Match.speed` (1);
  checked by fingerprinting whole CPU matches with every lobby modifier and every fighter's Classic ladder before
  and after (identical).
