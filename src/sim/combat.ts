// Hit detection and hit resolution: hitboxes (on bones) vs hurtboxes (capsules on bones), shields and parries,
// counters, armour, knockback, hitlag, grabs and throws.
import { A } from './acts';
import { fighterScale, fighterSkel } from './anim';
import type { CFighter } from './data';
import { ev } from './events';
import { bodyH, cfOf, flipGrav, grabRelease, startMove } from './fighter';
import { clamp, datan2, dcos, dsin as dsinx, segDist2 } from './math';
import { mod } from './mods';
import { bonePoint } from './rig';
import { heldItemDef, hitApplied } from './items';
import { SCRIPTS } from './scripts';
import type { Fighter, HitDef, HitProps, Skel, State } from './types';

export type Capsule = [number, number, number, number, number];

export function hurtCapsules(sk: Skel, cf: CFighter): Capsule[] {
  const r = cf.def.rig;
  const s = sk.scale;
  const lr = r.limb * s;
  return [
    [sk.hip[0], sk.hip[1], sk.neck[0], sk.neck[1], r.girth * s],
    [sk.head[0], sk.head[1], sk.head[0], sk.head[1], r.head * s * 1.02],
    [sk.shoulder[0], sk.shoulder[1], sk.elbowF[0], sk.elbowF[1], lr],
    [sk.elbowF[0], sk.elbowF[1], sk.handF[0], sk.handF[1], lr],
    [sk.shoulder[0], sk.shoulder[1], sk.elbowB[0], sk.elbowB[1], lr],
    [sk.elbowB[0], sk.elbowB[1], sk.handB[0], sk.handB[1], lr],
    [sk.hip[0], sk.hip[1], sk.kneeF[0], sk.kneeF[1], lr * 1.2],
    [sk.kneeF[0], sk.kneeF[1], sk.footF[0], sk.footF[1], lr],
    [sk.hip[0], sk.hip[1], sk.kneeB[0], sk.kneeB[1], lr * 1.2],
    [sk.kneeB[0], sk.kneeB[1], sk.footB[0], sk.footB[1], lr],
  ];
}

export function circleHitsCapsules(x: number, y: number, r: number, caps: Capsule[]): boolean {
  for (const c of caps) {
    const rr = r + c[4];
    if (segDist2(x, y, c[0], c[1], c[2], c[3]) <= rr * rr) return true;
  }
  return false;
}

/** where a hitbox is this frame (world), scaled by the fighter's size */
export function hitCircle(sk: Skel, h: HitDef): [number, number, number] {
  const [x, y] = bonePoint(sk, h.at, h.x ?? 0, h.y ?? 0);
  return [x, y, h.r * sk.scale];
}

export function shieldCircle(st: State, t: Fighter, cf: CFighter): [number, number, number] {
  const s = fighterScale(st, t, cf);
  const R = (cf.def.shieldR ?? 0.62 * cf.height) * s;
  const r = R * (0.38 + 0.62 * clamp(t.shield / 50, 0, 1));
  return [t.x, t.y - bodyH(st, t) * 0.5 * t.grav, r];
}

export function isShielding(t: Fighter): boolean {
  return t.act === A.SHIELD || t.act === A.SHIELDSTUN;
}

export function knockback(p: number, d: number, w: number, bkb: number, kbg: number, fkb?: number): number {
  if (fkb !== undefined) return ((1 + fkb / 2) * (200 / (w + 100)) * 1.4 + 18) * (kbg / 100) + bkb;
  return (((p / 10 + (p * d) / 20) * (200 / (w + 100)) * 1.4 + 18) * kbg) / 100 + bkb;
}

/** can a hit from team/attacker a land on t at all */
export function canTouch(st: State, a: Fighter | null, t: Fighter): boolean {
  if (t.out || t.act === A.DEAD || t.act === A.RESPAWN) return false;
  if (t.intang > 0 || t.invinc > 0 || t.starT > 0) return false;
  if (!a) return true;
  if (a.i === t.i) return false;
  if (st.cfg.teams && a.team === t.team && !st.cfg.friendlyFire) return false;
  // story grunts don't hurt each other
  if (st.cfg.players[a.i]?.grunt && st.cfg.players[t.i]?.grunt) return false;
  if (st.cfg.players[a.i]?.boss && st.cfg.players[t.i]?.grunt) return false;
  return true;
}

/** attacker-side multipliers: charge, staling, passives, items, modifiers */
export function attackMult(st: State, a: Fighter, moveIdx: number): { dmg: number; kb: number; fx?: string } {
  let dmg = 1;
  let kb = 1;
  let fx: string | undefined;
  if (a.act === A.MOVE && a.charge > 0) dmg *= 1 + (0.4 * a.charge) / 60;
  if (moveIdx >= 0 && cfOf(a).moveIds[moveIdx].startsWith('item')) {
    const d = heldItemDef(st, a);
    if (d?.power) {
      dmg *= d.power;
      kb *= d.kbPow ?? 1;
    }
  }
  if (moveIdx >= 0) {
    // stale-move negation
    let stale = 0;
    let found = false;
    for (let i = 0; i < a.stale.length; i++) {
      if (a.stale[i] === moveIdx) {
        stale += 0.08 - i * 0.008;
        found = true;
      }
    }
    dmg *= found ? 1 - stale : 1.05;
  }
  dmg *= cfOf(a).def.power ?? 1;
  if (a.giantT > 0 || mod(st, 'giant')) dmg *= 1.2;
  if (a.tinyT > 0 || mod(st, 'tiny')) dmg *= 0.75;
  if (mod(st, 'glass')) dmg *= 1.5;
  const pc = st.cfg.players[a.i];
  if (pc?.dmgMult) dmg *= pc.dmgMult;
  if (a.counterT > 0) dmg *= a.counterMult;
  const hook = SCRIPTS[`${cfOf(a).def.id}:mult`];
  if (hook) {
    const r = { dmg, kb, fx } as { dmg: number; kb: number; fx?: string };
    hook(st, a, null, r);
    dmg = r.dmg;
    kb = r.kb;
    fx = r.fx;
  }
  return { dmg, kb, fx };
}

export interface HitOpts {
  /** source point (for 'away' angles and shield pushback) */
  sx: number;
  sy: number;
  /** attacker facing (for relative angles) */
  facing: number;
  dmgMult: number;
  kbMult: number;
  proj: boolean;
  moveIdx: number;
  shielded: boolean;
  fxOverride?: string;
}

/** resolve one hit on t. Returns 'hit' | 'shield' | 'parry' | 'counter' | 'armor' | 'wind' */
export function applyHit(st: State, a: Fighter | null, t: Fighter, hp: HitProps, o: HitOpts): string {
  const tcf = cfOf(t);
  const dmg = Math.round(hp.dmg * o.dmgMult * 10) / 10;
  const side = t.x >= o.sx ? 1 : -1;
  // ---- windbox
  if (hp.wind) {
    const kb = knockback(t.dmg, 0, tcf.def.weight, hp.bkb, hp.kbg, hp.fkb) * o.kbMult;
    const wa = hp.away ? datan2(-(t.y - o.sy), t.x - o.sx) : o.facing > 0 ? hp.ang : 180 - hp.ang;
    t.kx += dcos(wa) * kb * 0.06;
    if (t.gnd < 0) t.ky += -dsinx(wa) * kb * 0.06;
    return 'wind';
  }
  // ---- shield
  if (o.shielded) {
    if (t.act === A.SHIELD && t.shieldT <= 5) {
      t.act = A.IDLE;
      t.af = 0;
      t.intang = 3;
      t.st.parries++;
      if (a && !o.proj) a.hitlag = Math.max(a.hitlag, 18);
      t.hitlag = 4;
      ev(st, 'parry', t.x, t.y - bodyH(st, t) * 0.5, t.i);
      return 'parry';
    }
    t.shield -= dmg + (hp.shield ?? 0);
    const stun = Math.floor(dmg * 0.6 + 2) + (o.proj ? 0 : 1);
    t.act = A.SHIELDSTUN;
    t.af = 0;
    t.a1 = stun;
    t.vx = side * Math.min(11, dmg * 0.42 + 1.5);
    const lag = Math.min(20, Math.floor((dmg * 0.65 + 6) * 0.67 * (hp.hitlag ?? 1)));
    t.hitlag = lag;
    if (a && !o.proj) {
      a.hitlag = Math.max(a.hitlag, lag);
      if (a.gnd >= 0) a.vx = -side * Math.min(6, dmg * 0.18);
    }
    ev(st, 'shield', t.x, t.y - bodyH(st, t) * 0.5, t.i, dmg);
    if (t.shield <= 0) {
      t.act = A.DIZZY;
      t.af = 0;
      t.dizzyT = Math.max(110, 300 - Math.floor(t.dmg));
      t.vy = -t.grav * 13;
      t.gnd = -1;
      t.shield = 0;
      ev(st, 'break', t.x, t.y, t.i);
    }
    return 'shield';
  }
  // ---- counters
  if (t.act === A.MOVE && !hp.unblockable) {
    const tm = tcf.moves[t.mv];
    if (tm.counter && t.mf >= tm.counter.f[0] && t.mf <= tm.counter.f[1]) {
      if (a && !o.proj) a.hitlag = Math.max(a.hitlag, 22);
      t.counterT = 60;
      t.counterMult = Math.max(tm.counter.mult, 1 + dmg / 20);
      if (a) t.facing = a.x >= t.x ? 1 : -1;
      t.a2 = a ? a.i : -1;
      startMove(st, t, tm.counter.move);
      t.intang = Math.max(t.intang, 10);
      ev(st, 'counter', t.x, t.y - bodyH(st, t) * 0.6, t.i);
      return 'counter';
    }
  }
  // ---- damage
  t.dmg = Math.min(999, t.dmg + dmg);
  t.hp -= dmg;
  t.st.taken += dmg;
  hitApplied(st, t, dmg);
  t.lastHitBy = a ? a.i : t.lastHitBy;
  t.lastHitT = 0;
  if (st.cfg.ult === 'meter') {
    const mul = mod(st, 'suddenult') ? 3 : 1;
    if (a && !a.ultReady) a.meter = Math.min(100, a.meter + dmg * 0.42 * mul);
    if (!t.ultReady) t.meter = Math.min(100, t.meter + dmg * 0.26 * mul);
    if (a && a.meter >= 100 && !a.ultReady) {
      a.ultReady = true;
      ev(st, 'ultready', a.x, a.y, a.i);
    }
    if (t.meter >= 100 && !t.ultReady) {
      t.ultReady = true;
      ev(st, 'ultready', t.x, t.y, t.i);
    }
  }
  if (a) {
    a.st.dealt += dmg;
    a.st.hits++;
    if (st.bomb.holder === a.i && st.bomb.cool <= 0 && !st.cfg.players[t.i]?.grunt) {
      st.bomb.holder = t.i;
      st.bomb.cool = 30;
      ev(st, 'bombpass', t.x, t.y, t.i);
    }
    if (mod(st, 'turbo') && !o.proj) a.cancel = 999;
  }
  // ---- knockback
  const w = tcf.def.weight * (t.giantT > 0 || mod(st, 'giant') ? 1.4 : 1) * (t.tinyT > 0 || mod(st, 'tiny') ? 0.65 : 1);
  const pct = st.cfg.mode === 'stamina' ? Math.max(0, t.dmg) : t.dmg;
  let kb = knockback(pct, dmg, w, hp.bkb, hp.kbg, hp.fkb) * o.kbMult;
  if (t.act === A.CROUCH && t.gnd >= 0) kb *= 0.85;
  const pc = st.cfg.players[t.i];
  if (pc?.kbTakenMult) kb *= pc.kbTakenMult;
  if (mod(st, 'glass')) kb *= 1.25;
  // ---- armour
  if (t.act === A.MOVE) {
    const tm = tcf.moves[t.mv];
    const armorMax = (tm.armor && t.mf >= tm.armor[0] && t.mf <= tm.armor[1] ? tm.armor[2] : 0) + (pc?.armor ?? 0);
    if (armorMax > 0 && dmg <= armorMax && kb < 140) {
      const lag = Math.min(30, Math.floor((dmg * 0.65 + 6) * (hp.hitlag ?? 1)));
      t.hitlag = lag;
      if (a && !o.proj) a.hitlag = Math.max(a.hitlag, lag);
      ev(st, 'armor', t.x, t.y - bodyH(st, t) * 0.5, t.i, dmg);
      return 'armor';
    }
  } else if ((pc?.armor ?? 0) > 0 && dmg <= (pc?.armor ?? 0) && kb < 120 && t.act !== A.HITSTUN) {
    t.hitlag = Math.min(30, Math.floor(dmg * 0.65 + 6));
    if (a && !o.proj) a.hitlag = Math.max(a.hitlag, t.hitlag);
    ev(st, 'armor', t.x, t.y - bodyH(st, t) * 0.5, t.i, dmg);
    return 'armor';
  }
  // ---- angle (absolute, math convention: 0 = right, 90 = up)
  let wa: number;
  let ang = hp.ang;
  if (ang === 361) ang = t.gnd >= 0 ? (kb < 60 ? 0 : kb > 88 ? 40 : ((kb - 60) / 28) * 40) : 40;
  if (hp.away) {
    wa = datan2(-(t.y - bodyH(st, t) * 0.5 - o.sy), t.x - o.sx);
    if (hp.ang !== 0 && hp.ang !== 361) wa = (side > 0 ? ang : 180 - ang);
  } else wa = o.facing > 0 ? ang : 180 - ang;
  // ---- release grabs, leave ledges
  if (t.grabbing >= 0) {
    const v = st.fighters[t.grabbing];
    if (v) grabRelease(st, t, v);
  }
  if (t.grabbedBy >= 0) {
    const h = st.fighters[t.grabbedBy];
    if (h && h.grabbing === t.i) {
      h.grabbing = -1;
      if (h.act === A.HOLD) h.act = A.IDLE;
    }
    t.grabbedBy = -1;
  }
  t.ledge = -1;
  // ---- hitlag and pending launch
  const elec = hp.fx === 'elec' ? 1.5 : 1;
  const lag = Math.min(30, Math.floor((dmg * 0.65 + 6) * (hp.hitlag ?? 1) * elec));
  t.hitlag = lag;
  if (a && !o.proj) a.hitlag = Math.max(a.hitlag, lag);
  t.act = A.HITSTUN;
  t.af = 0;
  t.mf = 0;
  t.vx = 0;
  t.vy = 0;
  t.kx = 0;
  t.ky = 0;
  t.ff = false;
  t.hitstun = Math.floor(kb * 0.4);
  t.lStun = t.hitstun;
  t.lTumble = kb > 80;
  t.tumble = false;
  t.lAng = wa;
  t.lSpd = kb * 0.27;
  t.helpless = false;
  t.hurtFx = 12;
  t.lastFx = o.fxOverride ?? hp.fx ?? 'hit';
  if (t.lSpd < 0.6) t.lSpd = 0.6;
  if (hp.freeze) t.frozenT = hp.freeze;
  if (hp.trip && t.gnd >= 0 && kb < 70) {
    t.act = A.DOWN;
    t.af = 6;
    t.lSpd = 0;
    t.hitstun = 0;
  }
  if (hp.gflip) {
    t.gravT = hp.gflip;
    if (t.grav > 0) flipGrav(st, t);
  }
  if (a && ((wa > 225 && wa < 315) || (wa > -135 && wa < -45)) && t.gnd < 0 && kb > 60) a.st.meteors++;
  ev(st, 'hit', (t.x + o.sx) / 2, t.y - bodyH(st, t) * 0.5 * t.grav, a ? a.i : -1, dmg, kb, o.fxOverride ?? hp.fx ?? 'hit');
  if (hp.sfx) ev(st, 'sfx', t.x, t.y, t.i, 0, 0, hp.sfx);
  return 'hit';
}

// ------------------------------------------------------------------ the per-frame pass

interface Cand {
  a: Fighter;
  t: Fighter;
  h: HitDef;
  k: number;
  shielded: boolean;
  cx: number;
  cy: number;
}

export function resolveFighterHits(st: State, skels: Skel[]): void {
  const fs = st.fighters;
  const cands: Cand[] = [];
  for (const a of fs) {
    if (a.act !== A.MOVE || a.hitlag > 0 || a.out) continue;
    if (st.timeStop > 0 && st.timeStopBy !== a.i) continue;
    const cf = cfOf(a);
    const m = cf.moves[a.mv];
    if (!m.hits) continue;
    const sk = skels[a.i];
    for (const t of fs) {
      if (!canTouch(st, a, t)) continue;
      if (t.act === A.GRABBED && t.grabbedBy === a.i) continue;
      const tcf = cfOf(t);
      let caps: Capsule[] | null = null;
      for (let k = 0; k < m.hits.length; k++) {
        const h = m.hits[k];
        if (a.mf < h.f[0] || a.mf > h.f[1]) continue;
        if (h.only === 'air' && t.gnd >= 0) continue;
        if (h.only === 'ground' && t.gnd < 0) continue;
        const grp = h.grp ?? 0;
        if (a.hitMask[t.i] & (1 << grp)) {
          if (!h.rehit || a.mf - a.hitAt[t.i] < h.rehit) continue;
        }
        const [cx, cy, r] = hitCircle(sk, h);
        if (h.grab) {
          if (a.grabbing >= 0 || t.act === A.LEDGE || t.grabbedBy >= 0) continue;
          caps ??= hurtCapsules(skels[t.i], tcf);
          if (circleHitsCapsules(cx, cy, r, caps)) {
            cands.push({ a, t, h, k, shielded: false, cx, cy });
            break;
          }
          continue;
        }
        let shielded = false;
        if (isShielding(t) && !h.unblockable) {
          const [sx, sy, sr] = shieldCircle(st, t, tcf);
          const dx = cx - sx;
          const dy = cy - sy;
          if (dx * dx + dy * dy <= (r + sr) * (r + sr)) shielded = true;
        }
        if (!shielded) {
          caps ??= hurtCapsules(skels[t.i], tcf);
          if (!circleHitsCapsules(cx, cy, r, caps)) continue;
        }
        cands.push({ a, t, h, k, shielded, cx, cy });
        break;
      }
    }
  }
  // grabs first (a grab and a hit on the same frame: the hit wins below if both land)
  for (const c of cands) {
    if (!c.h.grab) continue;
    if (c.a.act !== A.MOVE || c.t.grabbedBy >= 0 || c.a.grabbing >= 0) continue;
    grabConnect(st, c.a, c.t);
  }
  for (const c of cands) {
    if (c.h.grab) continue;
    const { a, t, h } = c;
    const grp = h.grp ?? 0;
    const firstHitOfMove = a.hitMask.every((x) => x === 0);
    a.hitMask[t.i] |= 1 << grp;
    a.hitAt[t.i] = a.mf;
    const mult = attackMult(st, a, a.mv);
    const r = applyHit(st, a, t, h, { sx: a.x, sy: a.y - bodyH(st, a) * 0.5, facing: a.facing, dmgMult: mult.dmg, kbMult: mult.kb, proj: false, moveIdx: a.mv, shielded: c.shielded, fxOverride: mult.fx });
    if (r === 'hit' || r === 'armor') {
      if (firstHitOfMove) {
        a.stale.unshift(a.mv);
        a.stale.length = 9;
      }
      const m = cfOf(a).moves[a.mv];
      const hook = SCRIPTS[`${cfOf(a).def.id}:onhit`];
      if (hook) hook(st, a, m, t);
      if (m.onHit && a.act === A.MOVE) startMove(st, a, m.onHit);
    }
  }
}

export function grabConnect(st: State, a: Fighter, t: Fighter): void {
  const m = cfOf(a).moves[a.mv];
  if (t.grabbing >= 0) {
    const v = st.fighters[t.grabbing];
    if (v) grabRelease(st, t, v);
  }
  t.act = A.GRABBED;
  t.af = 0;
  t.hitstun = 0;
  t.hitlag = 0;
  t.lSpd = 0;
  t.kx = 0;
  t.ky = 0;
  t.vx = 0;
  t.vy = 0;
  t.ledge = -1;
  t.grabbedBy = a.i;
  t.facing = -a.facing;
  a.grabbing = t.i;
  a.grabT = 90 + Math.min(130, Math.floor(t.dmg * 0.7));
  ev(st, 'grab', t.x, t.y, a.i);
  if (m.cmdGrab) {
    startMove(st, a, m.cmdGrab);
    return;
  }
  a.act = A.HOLD;
  a.af = 0;
  a.vx = 0;
}

/** throws release their victim; pummels hurt them */
export function throwsAndPummels(st: State): void {
  for (const a of st.fighters) {
    if (a.act !== A.MOVE || a.grabbing < 0 || a.hitlag > 0) continue;
    const m = cfOf(a).moves[a.mv];
    const v = st.fighters[a.grabbing];
    if (!v || v.act !== A.GRABBED) continue;
    if (m.pummel) {
      a.grabT--;
      if (a.grabT <= 0) {
        grabRelease(st, a, v);
        continue;
      }
    }
    if (m.pummel && a.mf === 4 && a.hitMask[v.i] === 0) {
      a.hitMask[v.i] = 1;
      v.dmg += m.pummel;
      v.hp -= m.pummel;
      a.st.dealt += m.pummel;
      a.hitlag = 5;
      v.hurtFx = 8;
      ev(st, 'hit', v.x, v.y - bodyH(st, v) * 0.5, a.i, m.pummel, 0, 'hit');
    }
    if (m.pummel && a.mf >= m.frames) {
      a.act = A.HOLD;
      a.af = 4;
      continue;
    }
    if (m.throw && a.mf === m.throw.release) {
      a.grabbing = -1;
      v.grabbedBy = -1;
      v.act = A.AIR;
      const mult = attackMult(st, a, -1);
      applyHit(st, a, v, { ...m.throw.hit, hitlag: m.throw.hit.hitlag ?? 0.6 }, { sx: a.x, sy: a.y - bodyH(st, a) * 0.5, facing: a.facing, dmgMult: mult.dmg, kbMult: mult.kb, proj: true, moveIdx: -1, shielded: false });
      ev(st, 'throw', v.x, v.y, a.i);
    }
  }
}

/** skeletons for everyone this frame */
export function allSkels(st: State): Skel[] {
  return st.fighters.map((f) => fighterSkel(st, f, cfOf(f)));
}

export { fighterSkel };
