// The pose a fighter is in this frame (drives hurtboxes, hitboxes and the art). Moves use their keyframes; every
// other state uses the base animations below (a fighter may override any of them in def.base).
import { A } from './acts';
import type { CFighter } from './data';
import { dsin } from './math';
import { evalKeys, IDLE, mix, resolve, runCycle, walkCycle } from './poses';
import { mod } from './mods';
import { worldSkel } from './rig';
import type { Fighter, Pose, Skel, State } from './types';

function base(cf: CFighter, name: string, f: number, fallback: () => Pose): Pose {
  const k = cf.def.base?.[name];
  if (k) {
    const last = k[k.length - 1][0];
    return evalKeys(k, last > 0 ? f % (last + 1) : 0, cf.def.poses);
  }
  return fallback();
}

const P = (cf: CFighter, n: string): Pose => resolve(n, cf.def.poses);

export function fighterPose(st: State, f: Fighter, cf: CFighter): Pose {
  const af = f.af;
  switch (f.act) {
    case A.IDLE:
    case A.DEAD:
      return base(cf, 'idle', af, () => {
        const p = P(cf, 'idle');
        const b = dsin(af * 4);
        p.y += 1.2 * b;
        p.armF += 4 * b;
        p.armB -= 3 * b;
        p.lean += 1.5 * b;
        return p;
      });
    case A.RESPAWN:
      return base(cf, 'idle', af, () => P(cf, 'idle'));
    case A.WALK:
      return base(cf, 'walk', af, () => walkCycle(af * 9, Math.min(1, Math.abs(f.vx) / Math.max(1, cf.def.stats.walk))));
    case A.DASH:
      return af < 3 ? mix(P(cf, 'ready'), P(cf, 'dash'), af / 3) : base(cf, 'run', af, () => mix(P(cf, 'dash'), runCycle(af * 16), Math.min(1, (af - 3) / 6)));
    case A.RUN:
      return base(cf, 'run', af, () => runCycle(af * 16 + 120));
    case A.TURN:
    case A.BRAKE:
      return P(cf, 'skid');
    case A.CROUCH:
      return base(cf, 'crouch', af, () => {
        const p = P(cf, 'crouch');
        p.y += 0.8 * dsin(af * 5);
        return p;
      });
    case A.SQUAT:
      return P(cf, 'squat');
    case A.LAND:
      return mix(P(cf, 'land'), P(cf, 'idle'), Math.min(1, af / Math.max(4, f.landLag)));
    case A.AIR: {
      if (f.tumble) {
        const p = P(cf, 'tumble');
        p.rot = (af * 22) % 360;
        return p;
      }
      if (f.jumpKind === 2 && af < 18) {
        const p = P(cf, 'tuck');
        p.rot = (af / 18) * 360 * (cf.def.base?.noflip ? 0 : 1);
        return mix(p, P(cf, 'fall'), Math.max(0, (af - 12) / 6));
      }
      const up = -f.vy * f.grav;
      if (up > 2) return base(cf, 'jump', af, () => mix(P(cf, 'fall'), P(cf, 'jump'), Math.min(1, up / 10)));
      return base(cf, 'fall', af, () => {
        const p = P(cf, 'fall');
        p.armF += 8 * dsin(af * 9);
        p.armB -= 8 * dsin(af * 9);
        return p;
      });
    }
    case A.HELPLESS: {
      const p = P(cf, 'helpless');
      p.armF += 14 * dsin(af * 18);
      p.armB += 14 * dsin(af * 18 + 180);
      return p;
    }
    case A.MOVE: {
      const m = cf.moves[f.mv];
      return evalKeys(m.anim, f.mf, cf.def.poses);
    }
    case A.SHIELD:
    case A.SHIELDSTUN:
    case A.SHIELDOFF:
      return P(cf, 'shield');
    case A.ROLL:
    case A.GETROLL:
    case A.TECHROLL:
    case A.LEDGEROLL: {
      const len = f.act === A.ROLL ? 30 : f.act === A.LEDGEROLL ? 40 : f.act === A.GETROLL ? 36 : 40;
      const t = Math.min(1, af / (len * 0.75));
      const p = P(cf, 'roll');
      // roll toward the movement direction: forward pitch if moving the way we face
      p.rot = t * 360 * (f.a1 === f.facing ? 1 : -1);
      return mix(p, P(cf, 'idle'), Math.max(0, (af - len * 0.75) / (len * 0.25)));
    }
    case A.SPOT:
      return af < 4 ? mix(P(cf, 'idle'), P(cf, 'dodge'), af / 4) : af > 18 ? mix(P(cf, 'dodge'), P(cf, 'idle'), (af - 18) / 8) : P(cf, 'dodge');
    case A.ADODGE: {
      const p = P(cf, 'airdodge');
      if (f.a1 !== 0 || f.a2 !== 0) p.rot = af * 16;
      return p;
    }
    case A.HITSTUN: {
      if (f.tumble && f.hitlag === 0) {
        const p = P(cf, 'tumble');
        p.rot = (af * 26) % 360;
        return p;
      }
      return P(cf, f.lStun > 30 || f.hitstun > 30 ? 'hurtBig' : 'hurt');
    }
    case A.DOWN:
      return P(cf, 'lying');
    case A.GETUP:
      return mix(P(cf, 'lying'), P(cf, 'idle'), Math.min(1, af / 20));
    case A.TECH:
      return af < 12 ? P(cf, 'roll') : mix(P(cf, 'roll'), P(cf, 'idle'), Math.min(1, (af - 12) / 10));
    case A.WALLTECH:
      return P(cf, 'tuck');
    case A.LEDGE:
      return base(cf, 'ledge', af, () => {
        const p = P(cf, 'ledge');
        p.legF += 6 * dsin(af * 5);
        p.legB -= 6 * dsin(af * 5);
        return p;
      });
    case A.LEDGEUP:
      return mix(P(cf, 'climb'), P(cf, 'idle'), Math.min(1, af / 26));
    case A.GRABBED:
    case A.TRAPPED:
      return P(cf, 'grabbed');
    case A.HOLD:
      return P(cf, 'hold');
    case A.DIZZY: {
      const p = P(cf, 'dizzy');
      p.lean += 10 * dsin(af * 6);
      p.head += 12 * dsin(af * 6 + 60);
      return p;
    }
    case A.TAUNT:
      return base(cf, 'taunt', af, () => {
        const p = P(cf, 'taunt');
        p.armF += 14 * dsin(af * 14);
        p.y += 3 * Math.abs(dsin(af * 7));
        return p;
      });
    case A.FROZEN:
      return P(cf, 'hurt');
    case A.PICKUP:
      return P(cf, 'crouch');
  }
  return { ...IDLE };
}

/** autoGround: feet planted when standing */
export function plants(f: Fighter): boolean {
  if (f.gnd < 0) return false;
  return f.act !== A.GRABBED && f.act !== A.LEDGE;
}

export function fighterScale(st: State, f: Fighter, cf: CFighter): number {
  let s = cf.def.scale ?? 1;
  if (f.giantT > 0 || mod(st, 'giant')) s *= 1.55;
  if (f.tinyT > 0 || mod(st, 'tiny')) s *= 0.6;
  const pc = st.cfg.players[f.i];
  if (pc?.giant) s *= 2;
  return s;
}

export function fighterSkel(st: State, f: Fighter, cf: CFighter): Skel {
  return worldSkel(cf.def.rig, fighterPose(st, f, cf), f.x, f.y, f.facing, f.grav, fighterScale(st, f, cf), plants(f));
}
