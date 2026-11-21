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
