# 🥊 Smash Your Bros

A 2D platform fighter for the browser: knock your bros off the stage. Damage percent, knockback that grows with
it, stocks, A and B moves in every direction, smash attacks you can charge, shields, parries, rolls, air dodges,
grabs and throws, ledges and teching. Sixteen original fighters, four 2D stages, items, cinematic ultimates, a
pile of lobby modifiers, a story campaign and a Classic ladder. Up to four players online with rollback netcode.

The whole show is a very sincere bromance: everyone hypes, compliments and flirts with their bros, then smashes
them into the stratosphere.

**Play:** https://josephjackman.com/games/smashyourbros/ (keyboard, or up to four gamepads on one machine)

## The show

*SMASH YOUR BROS LIVE!* is the galaxy's number-one show. Its host, Max Ratings (a TV for a head), beams champions
off a dozen worlds and makes best friends fight. Nobody asks why the friendships are the point. The answer is
the giant studio camera, The Big BROadcast, which turns bro-energy into ratings. Story mode: six episodes, ending
with a co-op fight against Max and the camera itself.

## The contestants

Open from the start: **Kit Cadet** (all-rounder), **Sir Clank** (swordfighter), **Granny Grapple** (grappler),
**Zippy** (speedster). Unlocked through tasks (then a NEW CONTESTANT fight): **Professor Hoot**, **Bouldar**,
**Vesper**, **Chef Flambé**, **Coral**, **Nimbus**, **Amp**, **Rumble Ruby**, and four that do things no platform
fighter has done: **Echo** (rewinds time), **Inverta** (flips gravity, walks on the underside of the stage),
**Smudge** (paints the floor), **Tempo** (hits on the beat hit harder). Details: `docs/ROSTER.md`.

## Controls (defaults; rebind in Settings)

| | Keyboard | Gamepad |
|---|---|---|
| Move | WASD (Shift = walk / tilt) | Left stick / d-pad |
| Jump | Space | X / Y |
| Attack (A) · Special (B) | J · K | A · B |
| Shield / dodge / tech | L | RB / RT |
| Grab | I | LB / LT |
| Smash stick | Arrow keys | Right stick |
| Ultimate | O (or Attack + Special) | Stick click |
| Taunt · Pause | T · Esc | View · Start |

Smash attacks: tap a direction and Attack together (or the smash stick); hold to charge. Shield right as a hit
lands to parry. Press shield just before you hit the floor while tumbling to tech.

## Modes

Smash (local, 2–4 bros, any mix of CPUs) · Online lobbies (4-digit codes, friends, invites; versus or story
co-op) · Story ("Prime-Time Brawl", co-op) · Classic (8 rounds + the host, intensity 1–9) · Contestants (bro
cards and unlock tasks) · Practice. Match modes: Stock, Time, Stamina, Coin Battle, King of the Hill, 2v2 teams.
Modifiers: low/heavy gravity, ice, wind, bouncy walls, turbo, giants, tiny, glass cannons, invisible, body swap,
mirror match, rising lava, shrinking arena, meteors, topsy-turvy, blackout, item rain, bounty, hot potato,
sudden ultimates, Live Studio Audience.

## Accounts

Same accounts and friends as **Shoallhell**: Smash Your Bros talks to Shoallhell's server (Fly.io) for sign-in,
its own save file, friends, lobbies and the online relay. Signing in to one game signs you in to the other.
"Play offline" keeps progress in the browser.

## Run it locally

Needs Node 22+ and the Shoallhell repo next to this one (for the server). PowerShell:

```powershell
cd C:\dev\SmashYourBros; npm install
npm run dev        # Shoallhell's server on :3031 + the game on http://localhost:5175/games/smashyourbros/
npm run typecheck; npm test
npm run build
```

Dev shortcuts: `?quick&p1=kit&p2=clank&cpu2=7&stage=galleon&boxes` jumps into a match; `?gallery=<id>&cell=300`
shows every pose and move of a fighter with hitboxes; `?slot=2` uses a second offline save.

## How it's built

- `src/sim/` — the deterministic simulation (60 Hz; hitboxes and hurtboxes ride a skeleton; rollback-safe).
- `src/data/` — fighters (moves as data), stages, story, classic, tasks.
- `src/render/` — the vector-cartoon renderer (rigged characters, effects, HUD, stages).
- `src/net/` — accounts, socket, WebRTC mesh, rollback session.
- `src/ui/` — menus. `src/audio/` — synthesized sound and music.
- Design: `docs/DESIGN.md`, `docs/ROSTER.md`, `docs/STORY.md`, `docs/DECISIONS.md`, `docs/FIGHTER_GUIDE.md`.

## Deploying

Push to `main` → `.github/workflows/ready.yml` tests and builds the game into `site/` on the `ready` branch → the
`games` repo publishes it at `/games/smashyourbros/`. Server changes ship with Shoallhell (`fly deploy`).
