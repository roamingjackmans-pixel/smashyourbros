// Stage geometry at a given frame (moving platforms follow deterministic paths) and fighter/stage collision.
// Solids are axis-aligned rectangles (y1 = top, y2 = bottom, world y down); plats are soft one-way platforms.
import { dsin } from './math';
import type { Path, StageDef } from './types';

export interface Surf {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  soft: boolean;
  /** movement since the previous frame */
  dx: number;
  dy: number;
  ledgeL: boolean;
  ledgeR: boolean;
  kind: string;
}

function off(p: Path | undefined, frame: number): [number, number] {
  if (!p) return [0, 0];
  const a = (360 * (frame + (p.phase ?? 0))) / p.period;
  const s = dsin(a);
  return [(p.ax ?? 0) * s, (p.ay ?? 0) * dsin(a + 90)];
}

let cacheKey = '';
let cacheVal: Surf[] = [];

/** all surfaces at this frame: solids first (index 0..), then soft platforms */
export function surfaces(stage: StageDef, frame: number, flat: boolean): Surf[] {
  const key = `${stage.id}|${frame}|${flat ? 1 : 0}`;
  if (key === cacheKey) return cacheVal;
  const out: Surf[] = [];
  const solids = flat ? stage.solids.slice(0, 1) : stage.solids;
  for (const s of solids) {
    const [ox, oy] = flat ? [0, 0] : off(s.path, frame);
    const [px, py] = flat ? [0, 0] : off(s.path, frame - 1);
    out.push({ x1: s.x1 + ox, y1: s.y1 + oy, x2: s.x2 + ox, y2: s.y2 + oy, soft: false, dx: ox - px, dy: oy - py, ledgeL: !!s.ledgeL, ledgeR: !!s.ledgeR, kind: s.kind ?? 'main' });
  }
  if (!flat) {
    for (const p of stage.plats) {
      const [ox, oy] = off(p.path, frame);
      const [px, py] = off(p.path, frame - 1);
      out.push({ x1: p.x1 + ox, y1: p.y + oy, x2: p.x2 + ox, y2: p.y + oy + 10, soft: true, dx: ox - px, dy: oy - py, ledgeL: false, ledgeR: false, kind: p.kind ?? 'plat' });
    }
  }
  cacheKey = key;
  cacheVal = out;
  return out;
}

export interface Ledge {
  x: number;
  y: number;
  /** -1 = left edge (hang on the left side), 1 = right edge */
  side: number;
  surf: number;
}

export function ledges(surfs: Surf[]): Ledge[] {
  const out: Ledge[] = [];
  surfs.forEach((s, i) => {
    if (s.ledgeL) out.push({ x: s.x1, y: s.y1, side: -1, surf: i });
    if (s.ledgeR) out.push({ x: s.x2, y: s.y1, side: 1, surf: i });
  });
  return out;
}

export interface Hit {
  land: number;
  wall: number;
  ceil: boolean;
  /** speed into the surface at contact (for bounces / techs) */
  hitSpeed: number;
}

/**
 * Move a body (feet at x,y; box hw wide each side, h tall; grav 1 = feet down) by (dx, dy) against the stage.
 * Returns the new position and what it touched. Sub-steps so fast launches can't tunnel.
 */
export function moveBody(
  surfs: Surf[],
  x: number,
  y: number,
  dx: number,
  dy: number,
  hw: number,
  h: number,
  grav: number,
  ignoreSoft: boolean,
): { x: number; y: number; hit: Hit } {
  const hit: Hit = { land: -1, wall: 0, ceil: false, hitSpeed: 0 };
  const steps = Math.max(1, Math.ceil(Math.max(Math.abs(dx), Math.abs(dy)) / 14));
  const sx = dx / steps;
  const sy = dy / steps;
  for (let n = 0; n < steps; n++) {
    // ---- horizontal
    let nx = x + sx;
    const top = grav > 0 ? y - h : y;
    const bot = grav > 0 ? y : y + h;
    for (let i = 0; i < surfs.length; i++) {
      const s = surfs[i];
      if (s.soft) continue;
      if (bot <= s.y1 + 0.5 || top >= s.y2 - 0.5) continue;
      if (nx + hw > s.x1 && nx - hw < s.x2) {
        if (sx > 0 && x + hw <= s.x1 + 0.5) {
          nx = s.x1 - hw - 0.01;
          hit.wall = 1;
          hit.hitSpeed = Math.abs(dx);
        } else if (sx < 0 && x - hw >= s.x2 - 0.5) {
          nx = s.x2 + hw + 0.01;
          hit.wall = -1;
          hit.hitSpeed = Math.abs(dx);
        } else if (sx === 0) {
          // pushed inside by a moving solid: shove out the short way
          nx = nx < (s.x1 + s.x2) / 2 ? s.x1 - hw - 0.01 : s.x2 + hw + 0.01;
        }
      }
    }
    x = nx;
    // ---- vertical
    let ny = y + sy;
    const falling = sy * grav > 0;
    for (let i = 0; i < surfs.length; i++) {
      const s = surfs[i];
      const overX = x + hw > s.x1 && x - hw < s.x2;
      if (!overX) continue;
      if (grav > 0) {
        if (falling) {
          // land on tops (center must be over the surface)
          const onTop = x >= s.x1 - 1 && x <= s.x2 + 1;
          if (onTop && y <= s.y1 + 0.5 && ny >= s.y1 && (!s.soft || !ignoreSoft)) {
            ny = s.y1;
            hit.land = i;
            hit.hitSpeed = Math.abs(dy);
          }
        } else if (!s.soft && sy < 0) {
          if (y - h >= s.y2 - 0.5 && ny - h < s.y2) {
            ny = s.y2 + h;
            hit.ceil = true;
            hit.hitSpeed = Math.abs(dy);
          }
        }
      } else {
        if (s.soft) continue;
        if (falling) {
          // flipped gravity: "fall" up onto undersides
          const onTop = x >= s.x1 - 1 && x <= s.x2 + 1;
          if (onTop && y >= s.y2 - 0.5 && ny <= s.y2) {
            ny = s.y2;
            hit.land = i;
            hit.hitSpeed = Math.abs(dy);
          }
        } else if (sy > 0) {
          if (y + h <= s.y1 + 0.5 && ny + h > s.y1) {
            ny = s.y1 - h;
            hit.ceil = true;
            hit.hitSpeed = Math.abs(dy);
          }
        }
      }
    }
    y = ny;
    if (hit.land >= 0 || hit.ceil) {
      // stop vertical sub-steps, keep horizontal
      for (let m = n + 1; m < steps; m++) {
        const nx2 = x + sx;
        let blocked = false;
        const top2 = grav > 0 ? y - h : y;
        const bot2 = grav > 0 ? y : y + h;
        for (const s of surfs) {
          if (s.soft) continue;
          if (bot2 <= s.y1 + 0.5 || top2 >= s.y2 - 0.5) continue;
          if (nx2 + hw > s.x1 && nx2 - hw < s.x2) blocked = true;
        }
        if (blocked) break;
        x = nx2;
      }
      break;
    }
  }
  return { x, y, hit };
}

/** is the point standing over surface s */
export function over(s: Surf, x: number): boolean {
  return x >= s.x1 && x <= s.x2;
}
