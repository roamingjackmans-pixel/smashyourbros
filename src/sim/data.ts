// The data tables the simulation indexes into (fighters, stages), compiled once at load.
import { FIGHTER_DEFS } from '../data/fighters';
import { STAGE_DEFS } from '../data/stages';
import { rigHeight } from './rig';
import type { FighterDef, MoveDef, ProjDef, StageDef } from './types';

export interface CFighter {
  def: FighterDef;
  index: number;
  moveIds: string[];
  moves: MoveDef[];
  moveIdx: Record<string, number>;
  projIds: string[];
  projs: ProjDef[];
  projIdx: Record<string, number>;
  /** standing height and collision half-width at scale 1 */
  height: number;
  hw: number;
}

/** item moves every fighter gets unless it defines its own */
const ITEM_MOVES: Record<string, MoveDef> = {
  itemSwing: {
    frames: 28,
    hits: [{ f: [7, 10], at: 'handF', x: 26, r: 22, dmg: 7, ang: 361, bkb: 30, kbg: 75 }],
    anim: [[0, 'swingWind'], [6, 'swingWind'], [9, 'swing'], [16, 'swing'], [28, 'idle']],
  },
  itemSmash: {
    frames: 46,
    charge: 9,
    hits: [{ f: [14, 17], at: 'handF', x: 28, r: 26, dmg: 15, ang: 40, bkb: 40, kbg: 95 }],
    anim: [[0, 'swingWind'], [9, ['overheadWind', { wep: 40 }]], [15, ['overhead', { wep: 0 }]], [24, 'overhead'], [46, 'idle']],
  },
  itemDash: {
    frames: 34,
    vel: [{ f: [1, 10], vx: 9 }, { f: [11, 34], vx: 2 }],
    hits: [{ f: [8, 12], at: 'handF', x: 26, r: 24, dmg: 9, ang: 50, bkb: 40, kbg: 70 }],
    anim: [[0, 'dash'], [7, 'swingWind'], [10, 'swing'], [34, 'idle']],
  },
  itemAir: {
    frames: 30,
    air: true,
    landLag: 10,
    hits: [{ f: [6, 10], at: 'handF', x: 24, r: 22, dmg: 8, ang: 50, bkb: 30, kbg: 70 }],
    anim: [[0, 'swingWind'], [6, 'swing'], [14, 'swing'], [30, 'fall']],
  },
  itemThrow: { frames: 22, script: 'item:throw', anim: [[0, 'throwB'], [5, 'throwF'], [12, 'throwF'], [22, 'idle']] },
  itemThrowAir: { frames: 22, script: 'item:throw', anim: [[0, 'throwB'], [5, 'throwF'], [22, 'fall']] },
  itemShoot: { frames: 18, script: 'item:fire', anim: [[0, 'cast'], [18, 'cast']] },
};

function compile(def: FighterDef, index: number): CFighter {
  for (const [k, m] of Object.entries(ITEM_MOVES)) if (!def.moves[k]) def.moves[k] = m;
  const moveIds = Object.keys(def.moves);
  const projIds = Object.keys(def.projs ?? {});
  const moveIdx: Record<string, number> = {};
  moveIds.forEach((id, i) => (moveIdx[id] = i));
  const projIdx: Record<string, number> = {};
  projIds.forEach((id, i) => (projIdx[id] = i));
  // sort keys by frame once, so evalKeys can scan
  for (const m of Object.values(def.moves)) m.anim.sort((a, b) => a[0] - b[0]);
  const s = def.scale ?? 1;
  return {
    def,
    index,
    moveIds,
    moves: moveIds.map((id) => def.moves[id]),
    moveIdx,
    projIds,
    projs: projIds.map((id) => def.projs![id]),
    projIdx,
    height: rigHeight(def.rig) * s,
    hw: (def.rig.girth + 8) * s,
  };
}

export const FIGHTERS: CFighter[] = FIGHTER_DEFS.map(compile);
export const FIGHTER_INDEX: Record<string, number> = {};
FIGHTERS.forEach((f, i) => (FIGHTER_INDEX[f.def.id] = i));
export const ROSTER: CFighter[] = FIGHTERS.filter((f) => !f.def.hidden);

export const STAGES: StageDef[] = STAGE_DEFS;
export const STAGE_INDEX: Record<string, number> = {};
STAGES.forEach((s, i) => (STAGE_INDEX[s.id] = i));

export function fighterIndex(id: string): number {
  const i = FIGHTER_INDEX[id];
  if (i === undefined) throw new Error(`Unknown fighter ${id}`);
  return i;
}
