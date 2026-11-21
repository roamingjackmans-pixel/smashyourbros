# CLAUDE.md — Smash Your Bros

A 2D platform fighter (percent, knockback, stocks, A/B moves, smash attacks, shields, teching, ledges) with an
original 16-fighter cast and bromance humour. Browser game (Vite + TypeScript, Canvas 2D, no framework). Online
up to 4 players with rollback netcode. Accounts, friends and the relay are **Shoallhell's server**
(`C:\dev\Shoallhell\server`, shared accounts). Hosted at `https://josephjackman.com/games/smashyourbros/`.

## Read first
1. `docs/DESIGN.md` — conventions (units, input, rig/pose angles, moves, knockback), modes, online
2. `docs/ROSTER.md` — the 16 fighters, moves, bro lines
3. `docs/DECISIONS.md` — why things are the way they are

## How we work
- Owner: build everything without stopping, decide and log it in `docs/DECISIONS.md`.
- Windows 11 + PowerShell 5.1 for anything given to the owner (chain with `;`).
- Never draw or name real Nintendo characters/stages; everything is original.
- Tone: affectionate bro comedy, PG, nothing gross.

## Rules that are easy to break
- `src/sim/` is deterministic: no `Math.random`, `Date`, DOM, or `Math.sin/cos/tan/atan2/pow/exp/log/hypot`
  (use `sim/math.ts`). Iterate arrays in index order. State must stay plain cloneable data.
- Presentation never changes state; events are de-duplicated by frame because rollback replays frames.
- Moves are data in `src/data/fighters/<id>.ts`; art in `src/render/fighters/<id>.ts`. Hitboxes ride bones.
- Every fighter must finish bot-vs-bot matches in `tests/sim.test.ts`.
- Menus must work by pad: clickables are focusable, Back has `data-back`, main action `data-pad-start` (DESIGN §5).
- Rendering: no canvas `filter` / `shadowBlur` / per-frame full-screen gradients; screen space via `screenT(c)` (D22).

## Commands
```powershell
npm run dev                      # Shoallhell server :3031 (from ..\Shoallhell) + Vite :5175
npm run typecheck; npm test
npm run build                    # dist/
```
Dev shortcuts: `?quick&p1=kit&p2=clank&cpu2=5&stage=main&boxes` jumps into a match; `?slot=2` = second save;
`?fps` = frame-time overlay.
