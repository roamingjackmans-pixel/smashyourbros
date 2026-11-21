# Writing a fighter

Each fighter is two files you own completely:

- `src/data/fighters/<id>.ts` — the moves, stats, rig, projectiles, scripts and flavour text (simulation data)
- `src/render/fighters/<id>.ts` — the art (`export const <id>Art: ArtDef = {...}`)

Both already exist as placeholders and are already registered in the two `index.ts` files. **Do not edit any other
file.** If you think the engine needs a change, say so in your report instead.

Read first: `docs/DESIGN.md` §2 (conventions), `docs/ROSTER.md` (your fighter's concept, moves and bro lines),
and the reference fighter **Kit Cadet**: `src/data/fighters/kit.ts` and `src/render/fighters/kit.ts`.
Engine types: `src/sim/types.ts` (`FighterDef`, `MoveDef`, `HitDef`, `ProjDef`, `Pose`). Shared pose library:
`src/sim/poses.ts`. Art helpers: `src/render/art.ts`.

## Ground rules

- **Original designs only.** Nothing may resemble a Nintendo / Smash Bros character, name, costume, signature
  move animation or catchphrase. Use the concept in ROSTER.md.
- **Tone:** sincere, over-the-top bromance comedy (fighters hype, compliment and flirt with their bros). PG,
  affectionate, nothing gross, never punching down. Bio, line, taunt and 3 win quotes in that voice.
- **Determinism:** data files run inside the simulation. No `Math.random`, `Date`, DOM, `Math.sin/cos/atan2/pow`
  in data files or scripts (use `dsin/dcos/datan2` from `src/sim/math.ts`, randomness from `rint(st, n)` in
  `src/sim/rng.ts`). Scripts read/write only the fighter, the state, and their own projectiles.
- Keep the file self-contained: export `const <id>: FighterDef`, and call `registerScripts({...})` at the
  bottom for any scripts (ids must start with `<id>:`).

## The FighterDef

```ts
export const zippy: FighterDef = {
  id: 'zippy', name: 'Zippy', title: '…', role: 'Speedster', color: '#ffcf3a',   // color = menu/HUD accent
  weight: 74,                       // Smash-style: 66 (very light) … 100 (middle) … 135 (super heavy)
  scale: 1,                         // optional overall size
  rig: { thigh, shin, torso, head, upper, fore, girth, limb, wep?, tail? },
  stats: { walk, dash, run, dashFrames, airSpeed, airAccel, airFric, groundFric, grav, fall, ffall, jump, hop, djump, jumps, squat },
  bio, line, taunt, wins: [3 strings], moveNames: { nspec, sspec, uspec, dspec, ult },
  projs: { … }, moves: { … }, poses?: { … }, base?: { … }, passive?: 'zippy:passive', history?: boolean, shieldR?: number,
};
```

**Rig** (Kit: thigh 24, shin 24, torso 36, head 21, upper 20, fore 18, girth 15, limb 7; standing height ≈ 121).
Heavies ~140–165 tall with girth 20–26; lights ~95–110. `wep` = weapon length (swords 55–75), `tail` length.

**Stats reference** (units/frame; Kit is the middle):

| | light/fast | Kit (middle) | heavy |
|---|---|---|---|
| walk / dash / run | 11 / 21 / 19 | 9.5 / 17 / 15.5 | 7.5 / 13.5 / 12 |
| airSpeed / airAccel | 10.8 / 0.6 | 10 / 0.55 | 8.5 / 0.45 |
| grav / fall / ffall | 0.95 / 16 / 25 (fast faller) | 0.78 / 13.5 / 21 | 0.85 / 15 / 23 |
| floaty | grav 0.55, fall 10, ffall 16 | | |
| jump / hop / djump | 22 / 14.5 / 20 | 21.5 / 14.5 / 20 | 20 / 13.5 / 19 |
| jumps (air jumps) | 1 (Nimbus: 4) | 1 | 1 |
| squat, dashFrames | 3, 10 | 3, 11 | 4, 12 |

## Moves

Required ids: `jab1 jab2 jab3` (or one `jab1` with a `loop` for rapid jabs), `ftilt utilt dtilt dash fsmash usmash
dsmash nair fair bair uair dair nspec sspec uspec dspec grab dashgrab pummel fthrow bthrow uthrow dthrow
ledgeatk getupatk ult`. Optional air versions of specials: `nspecAir`, `sspecAir`, `uspecAir`, `dspecAir` (used
when the special starts in the air). Extra helper moves (e.g. `dspecLand`, `nspecFire`, `sspecThrow`) are fine.

Frames start at 1. Typical frame data (copy Kit's shapes):

| move | total | active | damage | angle / bkb / kbg |
|---|---|---|---|---|
| jab1/2 | 16–20 | 2–4 | 2–3 | 361 / 18 / 25 (links) |
| jab3 / finisher | 26–32 | 4–6 | 4–5 | 45 / 45 / 90 |
| ftilt | 24–30 | 5–8 | 7–10 | 361 / 20 / 90 |
| utilt | 26–32 | 5–10 | 6–8 | 90–100 / 25 / 120 |
| dtilt | 20–26 | 5–7 | 5–7 | 70–80 / 30 / 70 (combo starter) or 20/40/80 |
| dash attack | 34–40 | 6–10 | 8–11 | 50–70 / 55 / 60 |
| fsmash | 42–50, `charge: 8–12` | 12–16 | 15–20 | 361 or 30–40 / 30 / 98–105 |
| usmash | 40–46, charge 5–8 | 8–14 | 14–17 | 85–95 / 30 / 98 |
| dsmash | 40–46, charge 4–6 | 6–8 front, later back | 11–15 | 25–35 / 30 / 95 |
| nair | 34–40, landLag 6–8 | 3–20 (strong early) | 8 → 5 | 361 |
| fair | 36–44, landLag 10–14 | 8–14 | 11–14 | 40 / 34 / 98 (or 270 meteor) |
| bair | 30–36, landLag 8–10 | 5–10 | 11–13 | 361 / 20 / 100 (a kill move) |
| uair | 30–36, landLag 7–9 | 4–10 | 7–9 | 75–85 / 25 / 110 |
| dair | 38–46, landLag 14–18 | 10–16 | 12–15 | 270 (meteor) / 20 / 85 |
| grab / dashgrab | 30 / 38 | 6–8 / 8–11 | `grab: true` | |
| throws | 26–36, `throw: { release, hit }` | | 6–12 | fthrow 40, bthrow 135–145, uthrow 90, dthrow 60–80 |
| ledgeatk / getupatk | 44–50 | ~16–24 | 7–9 | 361 / 45 / 45 |

Aerials need `air: true`, `landLag`, `autoCancel: [3, frames-6]`. Up specials: `helpless: true`, `landHelpless`
20–24, `ledgeFrom` ~8, upward `vel`. Side specials that recover: `oncePerAir: true`.

**Hitboxes** (`HitDef`): `{ f: [from, to], at: bone, x, y, r, dmg, ang, bkb, kbg, fx?, grp?, rehit?, only?, ... }`.
Bones: `hip torso neck head shoulder elbowF handF elbowB handB kneeF footF kneeB footB wep wepMid tail`.
`x`/`y` offset from the bone in the fighter's local frame (x forward, y up). **Hitboxes ride the skeleton, so
put them on the bone that is swinging in your animation**, and check them in the gallery (below). One move hits
a target once unless you split hitboxes into groups (`grp`) or use `rehit` (multi-hits: low kbg, then a final
`grp: 1` launcher). Earlier hitboxes in the list win when several touch. Angle 361 = "auto" (low on the ground
at low knockback). 270 = straight down (meteor). Angles > 90 send backward (bthrow 140).
`fx` = spark/sound flavour: `hit slash fire elec ice water dark paint sound magic rock wind note time grav food`.

**Animation** (`anim`): keyframes `[frame, pose, ease?]`, poses from `sim/poses.ts` (`'jab1'`, `'kick'`,
`'smashWind'`, `'swing'`, …) or partial poses (`{ armF: 120, lean: 20 }`) or tweaks (`['kick', { legF: 80 }]`).
Your own named poses go in `poses: { … }`. Angle meanings: DESIGN.md §2 (armF 0 hang / 90 forward / 180 up;
legF + forward; shin + knee bends; rot/lean + forward; `wep` relative to the forearm). Keep the strike pose on
the active frames; wind-up before, recover to `'idle'` (or `'fall'` for aerials) by the last frame. Rotations
(`rot`) beyond ±360 are fine for spins and flips.

**Movement in moves:** `vel: [{ f: [a, b], vx, vy, grav, noDrift, add }]` — local units (vx forward, vy UP).
**Projectiles:** `projs: { name: ProjDef }`, fired with `shots: [{ f, proj: 'name', at: 'handF', x, y }]`.
ProjDef options: `vx vy grav drag life r hit hits rehit pierce bounce roll homing boomerang stick ghost trap pull
paint puddle reflectable hp pulse fuse explode chargeable spin kind`. `kind` is the visual id you draw.
**Specials helpers:** `chargeB: { at, max, release }` (hold B to charge; shield stores it), `counter: { f, move,
mult }`, `reflect: { f, r, at, x, y }`, `cmdGrab: 'throwMove'` (grab boxes in a special → that throw move),
`armor: [from, to, maxDamage]`, `intang: [from, to]`, `landInto`, `onHit`, `turn`, `reverse`, `edgeStop`,
`next: [{ move, from, to, on }]` (chains), `loop` (rapid jab), `ult: true`.
**Scripts** for anything else: `script: 'zippy:static'` on a move, `passive: 'zippy:passive'` on the fighter,
plus hooks `'<id>:mult'` (multiply your outgoing damage/kb: `(st, f, null, out) => { out.dmg *= …; out.kb *= …;
out.fx = … }`) and `'<id>:onhit'` (`(st, f, move, target) => …`). Script signature `(st, f, m, extra)`. Useful
imports: `startMove, shoot, flipGrav, cfOf, bodyH` (sim/fighter), `spawnProj, paintAt` (sim/projectiles),
`ev` (sim/events, for presentation events), `rint` (sim/rng), `dsin/dcos/datan2` (sim/math), `A` (sim/acts),
`STAGES` (sim/data). Per-fighter scratch: `f.v[0..7]` (persist through the match), `f.stored` (0..1 charge).
**Ultimate** (`ult`): `ult: true` gives a 50-frame cinematic freeze and intangibility. Make it big: stage-wide
projectiles spawned by a script at a world position (see `kit:ult`), or a huge rush. Damage ~25–40 total,
strong launch.

## Art

`ArtDef` (`src/render/art.ts`): `palettes` (8, each `{ name, main, second, accent, skin, extra }` — make them
distinct and fun), `limb` (fill width, ~10–14), optional `upperArm/foreArm/thigh/shin` colour pickers, `handR`,
`footL`, and draw hooks `back torso head hand foot weapon tail front` (+ `portrait` unused). Style: **bold vector
cartoon** — thick dark outline (`v.ol`, ~3px), flat fills, one darker shade, big readable silhouette, expressive
face (`eyes()`, `mouth()` helpers react to `v.expr`). Draw parts in a bone frame with `boneFrame(c, v, point,
phi)` … `c.restore()`: origin at the bone point, +x = forward, −y = along the bone. Head frame: `boneFrame(…,
k.head, k.ang.head)` is applied for you before `head()`; draw the head centred at 0,0 (radius = rig.head),
face toward +x. Feet: `boneFrame(c, v, k.footF, k.ang.shF - 180)` makes "standing" = 0 rotation (sole along
+x). Weapons: `boneFrame(c, v, k.handF, k.ang.wep)` and draw the blade along −y up to `rig.wep`.
Projectile visuals: `registerProjDraw('kind', (c, p, r, t, col) => …)` from `src/render/things.ts`, called at
module load in your art file. You may draw purely visual extras from `v.f` / `v.st` (ghost trails, beat rings,
glows), but never change state from art code.

## Checking your work

```powershell
npm run typecheck
npx vitest run tests/sim.test.ts     # every fighter's moves run; 4-player CPU matches finish
```
Visual check in the browser (dev server on port 5175 is already running; open your own tab):
- `http://localhost:5175/games/smashyourbros/?gallery=<id>&cell=300` — every pose and move with hitboxes
- `http://localhost:5175/games/smashyourbros/?gallery=<id>&pal=3` — another palette
- `http://localhost:5175/games/smashyourbros/?quick&p1=<id>&p2=kit&cpu1=7&cpu2=7&boxes` — CPU vs CPU live
Check: the silhouette reads at small size, the face points forward, hitboxes sit on the swinging limb/weapon on
active frames, smash attacks look powerful (wind-up → big extension), aerials end in `'fall'`, nothing explodes
into weird angles mid-blend (if a limb spins the wrong way between two keys, add an intermediate key).
