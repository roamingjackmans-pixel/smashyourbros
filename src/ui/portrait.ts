// Fighters drawn into menu canvases: roster tiles, the big render on each player slot, results poses.
import { A } from '../sim/acts';
import { fighterSkel } from '../sim/anim';
import { FIGHTER_INDEX, FIGHTERS } from '../sim/data';
import type { Fighter, State } from '../sim/types';
import { artFor } from '../render/fighters';
import { drawFighter } from '../render/fighterDraw';
import { shade } from '../render/art';

let dummy: State | null = null;
function dummyState(): State {
  dummy ??= {
    frame: 0,
    cfg: { players: [], mods: [], mode: 'stock' },
    modBits: 0,
    audience: { t: 0, mod: '', left: 0 },
    paint: [],
    fighters: [],
    ev: [],
  } as unknown as State;
  return dummy;
}

function fake(def: number, act: number, af: number, mv = 0, mf = 0): Fighter {
  return {
    i: 0,
    def,
    act,
    af,
    mv,
    mf,
    x: 0,
    y: 0,
    facing: 1,
    grav: 1,
    gnd: 0,
    hitlag: 0,
    hurtFx: 0,
    invinc: 0,
    starT: 0,
    frozenT: 0,
    giantT: 0,
    tinyT: 0,
    v: [0, 0, 0, 0, 0, 0, 0, 0],
    hist: [],
    lSpd: 0,
    tumble: false,
    jumpKind: 0,
    vy: 0,
  } as unknown as Fighter;
}

export type PosePick = 'idle' | 'taunt' | 'win' | 'fsmash' | 'ready';

/** draw a fighter standing on y = baseline, centred on x, about `height` px tall */
export function drawFighterAt(c: CanvasRenderingContext2D, id: string, palette: number, x: number, baseline: number, height: number, t: number, pose: PosePick = 'idle', facing = 1, silhouette = false): void {
  const def = FIGHTER_INDEX[id];
  if (def === undefined) return;
  const cf = FIGHTERS[def];
  let f: Fighter;
  if (pose === 'taunt') f = fake(def, A.TAUNT, t % 60);
  else if (pose === 'win') f = fake(def, A.TAUNT, (t % 50) + 5);
  else if (pose === 'fsmash' && cf.moveIdx.fsmash !== undefined) {
    const m = cf.moves[cf.moveIdx.fsmash];
    const first = m.hits?.length ? m.hits[0].f[0] : 10;
    f = fake(def, A.MOVE, 0, cf.moveIdx.fsmash, first + 1);
  } else f = fake(def, A.IDLE, t);
  f.facing = facing;
  const st = dummyState();
  const k = fighterSkel(st, f, cf);
  const sc = height / cf.height;
  c.save();
  c.translate(x, baseline);
  c.scale(sc, sc);
  if (silhouette) c.filter = 'brightness(0)';
  drawFighter(c, st, f, { palette, tint: '#fff', still: true, skel: k }, t);
  c.restore();
}

/** a roster tile: fighter colour backdrop + head-and-shoulders */
export function drawTile(c: CanvasRenderingContext2D, w: number, h: number, id: string, palette: number, t: number, locked: boolean): void {
  const def = FIGHTER_INDEX[id];
  if (def === undefined) return;
  const cf = FIGHTERS[def];
  const art = artFor(id);
  const pal = art.palettes[palette % art.palettes.length];
  const g = c.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, shade(cf.def.color, 0.15));
  g.addColorStop(1, shade(cf.def.color, -0.55));
  c.fillStyle = g;
  c.fillRect(0, 0, w, h);
  c.globalAlpha = 0.15;
  c.fillStyle = '#fff';
  for (let i = -2; i < 6; i++) c.fillRect(i * w * 0.28 + ((t * 0.3) % (w * 0.28)), 0, w * 0.1, h);
  c.globalAlpha = 1;
  void pal;
  drawFighterAt(c, id, palette, w * 0.5, h * 1.25, h * 1.35, t, 'idle', 1, locked);
}
