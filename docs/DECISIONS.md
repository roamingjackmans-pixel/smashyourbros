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
