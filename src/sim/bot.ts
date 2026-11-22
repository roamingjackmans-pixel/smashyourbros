// CPU bros, levels 1-9. Deterministic (stateless per-frame randomness from a hash, memory in f.bm), so CPUs play
// identically on every machine in online matches. They read the state like a player would.
//
// bm[0] plan  bm[1] plan timer  bm[2] target  bm[3] think cooldown  bm[4] queued action  bm[5] held buttons
// bm[6] stick x  bm[7] stick y
import { A } from './acts';
import { STAGES } from './data';
import { B_ATTACK, B_GRAB, B_JUMP, B_SHIELD, B_SPECIAL, B_TAUNT, B_ULT, C_DOWN, C_LEFT, C_RIGHT, C_UP, ix, iy, pack } from './input';
import { hash32 } from './math';
import { cfOf } from './fighter';
import { surfaces } from './stage';
import type { Fighter, State } from './types';

const P_NEUTRAL = 0;
const P_RECOVER = 4;
const P_HOP = 6;

// ---- the difficulty curve (D26): one skill table per level. Levels 1-5 got weaker tactics: level 1 is a pushover
// (slow to think, often just stands there, walks, only light attacks, never shields, techs or DIs, recovers late and
// falls a lot). Levels 6-9 keep the old tactics exactly (the same fractions, so the same decisions), so balance
// measured at levels 6 and 9 (D25) carries over; levels 7-9 get hard through sim/cpu.ts (they hit harder and fly
// less far). Smarter top-level tactics (parries, follow-ups) were tried and dropped: they favoured some fighters.
//                      lvl:  -   1     2     3     4     5     6     7     8     9
/** frames between plans */
const REACT = [0, 52, 38, 26, 17, 12, 8, 6, 4, 3];
/** chance a plan is "stand around and do nothing much" */
const IDLE = [0, 0.6, 0.4, 0.22, 0.1, 0.04, 0, 0, 0, 0];
/** chance per frame to shield a threat that's about to hit */
const SHIELD = [0, 0, 0.02, 0.07, 0.2, 0.33, 6 / 13, 7 / 13, 8 / 13, 9 / 13];
/** chance to DI (survive) while launched */
const DI = [0, 0, 0.08, 0.2, 0.35, 0.45, 6 / 11, 7 / 11, 8 / 11, 9 / 11];
/** chance to tech when landing in tumble */
const TECH = [0, 0, 0, 0.06, 0.18, 0.3, 6 / 12 - 0.05, 7 / 12 - 0.05, 8 / 12 - 0.05, 9 / 12 - 0.05];
/** chance to pounce on a lined-up target between plans */
const POUNCE = [0, 0, 0.03, 0.1, 0.22, 0.33, 6 / 14, 7 / 14, 8 / 14, 9 / 14];
/** chance to grab out of shield when the attacker is in endlag */
const PUNISH = [0, 0, 0.08, 0.2, 0.35, 0.5, 0.6, 0.7, 0.8, 0.9];
/** chance to go for a smash when the target is in endlag or at kill percent (else a light attack) */
const SMASH = [0, 0, 0.15, 0.4, 0.7, 0.9, 1, 1, 1, 1];
/** how far below the stage (units) a recovering CPU waits before jumping / up-special (late = falls more) */
const JUMP_AT = [0, 150, 100, 45, 0, -40, -40, -40, -40, -40];
const UPB_AT = [0, 230, 160, 100, 60, 50, 50, 50, 50, 50];
/** approach speed: low levels walk */
const MOVE_SPEED = [0, 45, 55, 75, 100, 100, 100, 100, 100, 100];
/** chance to go for the edge-guard smash when a target comes back */
const EDGE = [0, 0, 0, 0, 0, 0.4, 0.4, 0.4, 0.4, 0.4];
/** chance to wait for the hit and shield at the last moment, a parry (levels 7-9) */


function rnd(st: State, f: Fighter, salt: number): number {
  return hash32(st.frame, f.i * 977 + salt, st.cfg.seed) / 4294967296;
}

function mainStage(st: State): { x1: number; x2: number; y: number } {
  const s = surfaces(STAGES[st.stage], st.frame, !!st.cfg.flat)[0];
  return { x1: s.x1, x2: s.x2, y: s.y1 };
}

function isFoe(st: State, f: Fighter, o: Fighter): boolean {
  if (o.i === f.i || o.out || o.act === A.DEAD) return false;
  if (st.cfg.teams && o.team === f.team) return false;
  const pf = st.cfg.players[f.i];
  const po = st.cfg.players[o.i];
  if (pf?.grunt && (po?.grunt || po?.boss)) return false;
  if (pf?.boss && po?.grunt) return false;
  return true;
}

function pickTarget(st: State, f: Fighter): Fighter | null {
  let best: Fighter | null = null;
  let bd = 1e12;
  for (const o of st.fighters) {
    if (!isFoe(st, f, o)) continue;
    const dx = o.x - f.x;
    const dy = o.y - f.y;
    let d = dx * dx + dy * dy * 1.5;
    if (st.bounty === o.i) d *= 0.6;
    if (st.cfg.players[o.i]?.cpu === 0) d *= 0.85;
    if (d < bd) {
      bd = d;
      best = o;
    }
  }
  return best;
}

function attacking(o: Fighter): boolean {
  if (o.act !== A.MOVE) return false;
  const m = cfOf(o).moves[o.mv];
  if (!m.hits) return false;
  for (const h of m.hits) if (!h.grab && o.mf <= h.f[1] && o.mf >= h.f[0] - 8) return true;
  return false;
}

function inEndlag(o: Fighter): boolean {
  if (o.act === A.LAND && o.landLag > 6) return true;
  if (o.act === A.MOVE) {
    const m = cfOf(o).moves[o.mv];
    if (!m.hits?.length) return o.mf > 4;
    const last = Math.max(...m.hits.map((h) => h.f[1]));
    return o.mf > last + 2;
  }
  return o.act === A.SHIELDOFF || o.act === A.DIZZY || o.act === A.DOWN || o.act === A.HELPLESS;
}

/** run toward dir: a fresh press from neutral starts a dash; once dashing/running, keep holding */
function runToward(f: Fighter, dir: number): number {
  if (f.act === A.DASH || f.act === A.RUN) return dir * 100;
  return ix(f.cur) !== 0 ? 0 : dir * 100;
}

export function botInput(st: State, f: Fighter): number {
  const lvl = Math.max(1, Math.min(9, f.cpu));
  const bm = f.bm;
  const cf = cfOf(f);
  const stage = mainStage(st);
  const edgeL = stage.x1;
  const edgeR = stage.x2;
  const center = (edgeL + edgeR) / 2;
  const offstage = f.x < edgeL - 10 || f.x > edgeR + 10 || f.y > stage.y + 15;
  let x = 0;
  let y = 0;
  let b = 0;
  let c = 0;
  // ---- held buttons from last frame's plan (full hops, shields)
  if (bm[5] && bm[1] > 0) {
    b |= bm[5];
    bm[1]--;
    if (bm[1] <= 0) bm[5] = 0;
  }
  const t = pickTarget(st, f);
  bm[2] = t ? t.i : -1;
  const react = REACT[lvl];

  // ---- being hit: DI and tech
  if (f.act === A.HITSTUN || f.tumble) {
    if (rnd(st, f, 1) < DI[lvl]) {
      // survival DI: toward the stage centre and up
      x = f.x < center ? 70 : -70;
      y = 70;
    }
    const nearGround = f.y > stage.y - 120 && f.y < stage.y + 5 && f.x > edgeL - 20 && f.x < edgeR + 20 && f.vy + f.ky > 0;
    if (nearGround && rnd(st, f, 2) < TECH[lvl]) b |= B_SHIELD;
    if (f.tumble && f.act === A.AIR) {
      // recover from tumble as usual below
    } else return pack(x, y, b, c);
  }
  if (f.act === A.GRABBED || f.act === A.TRAPPED || f.act === A.DIZZY || f.act === A.FROZEN) {
    // mash
    const m = st.frame % 4 < 2;
    return pack(m ? 100 : -100, 0, m && lvl > 3 ? B_JUMP : 0, 0);
  }
  if (f.act === A.DOWN) {
    const r = rnd(st, f, 3);
    if (f.af < 26 + (10 - lvl) * 3) return pack(0, 0, 0, 0);
    if (r < 0.3) return pack(0, 0, B_ATTACK, 0);
    if (r < 0.6) return pack(f.x < center ? 100 : -100, 0, 0, 0);
    return pack(0, 100, 0, 0);
  }
  if (f.act === A.RESPAWN) {
    if (f.af > 40 + rnd(st, f, 4) * 60) return pack(0, -100, 0, 0);
    return pack(0, 0, 0, 0);
  }

  // ---- ledge
  if (f.act === A.LEDGE) {
    const wait = 10 + Math.floor(rnd(st, f, 5) * (12 - lvl) * 4);
    if (f.af < wait) return pack(0, 0, 0, 0);
    const r = rnd(st, f, 6);
    const toward = f.facing * 100;
    if (r < 0.3) return pack(toward, 0, 0, 0);
    if (r < 0.55) return pack(0, 0, B_JUMP, 0);
    if (r < 0.75) return pack(0, 0, B_SHIELD, 0);
    return pack(0, 0, B_ATTACK, 0);
  }

  // ---- during an up-special offstage: steer for the ledge. It used to fall through to the fighting logic and steer
  // at the opponent, so drifting up-specials drifted the wrong way and aimed ones (Hoot's teleport) went straight up
  // or out to sea (D25).
  if (offstage && f.gnd < 0 && f.act === A.MOVE && (cf.moveIds[f.mv] ?? '').startsWith('uspec')) {
    const side = f.x < center ? -1 : 1;
    const ledgeX = side < 0 ? edgeL : edgeR;
    const under = f.y - stage.y > 15 && (side < 0 ? f.x > edgeL - 30 : f.x < edgeR + 30);
    // just onto the stage, a little above it; from under the stage, out past the ledge first
    const tx = under ? ledgeX + side * 40 : ledgeX - side * 30;
    const ty = stage.y - 40;
    const ax = tx - f.x;
    const ay = f.y - ty; // + = the target is above
    // an aimed move (a teleport) gets the exact direction; the rest drift: full speed toward the target, stick up
    if (cf.moves[f.mv]?.aim) {
      const m = Math.sqrt(ax * ax + ay * ay) || 1;
      return pack((ax / m) * 100, (ay / m) * 100, 0, 0);
    }
    return pack(ax >= 0 ? 100 : -100, ay > 0 ? 100 : 0, 0, 0);
  }

  // ---- recovery: aim just outside the nearest ledge; never fly up into the underside of the stage
  if (offstage && f.gnd < 0 && f.act !== A.MOVE && f.act !== A.ADODGE) {
    const side = f.x < center ? -1 : 1;
    const ledgeX = side < 0 ? edgeL : edgeR;
    const aimX = ledgeX + side * 50;
    const below = f.y - stage.y; // + = below the stage top
    const under = below > 15 && (side < 0 ? f.x > edgeL - 30 : f.x < edgeR + 30);
    const farX = Math.abs(f.x - aimX);
    // under the stage: get out sideways first
    const dir = under ? side : aimX > f.x ? 1 : -1;
    x = dir * 100;
    bm[0] = P_RECOVER;
    if (f.act === A.HELPLESS) return pack(ledgeX > f.x ? 100 : -100, 0, 0, 0);
    if (f.jumps > 0 && (below > JUMP_AT[lvl] || (lvl >= 5 && f.vy > 4)) && f.vy > -3 && !(under && below < 120)) return pack(x, 0, B_JUMP, 0);
    const desperate = below > 380;
    if (f.jumps === 0 && f.vy > -2 && (desperate || (!under && (below > UPB_AT[lvl] || (lvl >= 4 && farX > 260 && below > -100))))) {
      // side special first when far out and the fighter has a recovery side B
      if (farX > 230 && below < 140 && cf.moves[cf.moveIdx.sspec]?.oncePerAir && !(f.airUsed & (1 << (cf.moveIdx.sspec % 30)))) return pack(ledgeX > f.x ? 100 : -100, 0, B_SPECIAL, 0);
      return pack((ledgeX > f.x ? 1 : -1) * (farX > 120 ? 70 : 35), 100, B_SPECIAL, 0);
    }
    return pack(x, 0, 0, 0);
  }

  if (f.act !== A.HOLD && f.act !== A.MOVE) bm[4] = 0;
  // ---- holding someone: throw
  if (f.act === A.HOLD) {
    if (f.af < 6 + (10 - lvl) * 2) return pack(0, 0, 0, 0);
    const v = st.fighters[f.grabbing];
    if (!v) return pack(0, 0, 0, 0);
    if (bm[4] < 2 && v.dmg < 60 && rnd(st, f, 7) < 0.4 && st.frame % 12 === 0) {
      bm[4]++;
      return pack(0, 0, B_ATTACK, 0);
    }
    const towardEdge = (f.x < center ? -1 : 1) === f.facing;
    const r = rnd(st, f, 8);
    if (v.dmg > 110) return pack(towardEdge ? f.facing * 100 : -f.facing * 100, 0, 0, 0);
    if (r < 0.35) return pack(0, -100, 0, 0);
    if (r < 0.6) return pack(0, 100, 0, 0);
    return pack(towardEdge ? f.facing * 100 : -f.facing * 100, 0, 0, 0);
  }

  if (!t) {
    // nobody to fight: drift to the centre and taunt
    if (Math.abs(f.x - center) > 80) x = f.x < center ? 60 : -60;
    else if (rnd(st, f, 9) < 0.01) b |= B_TAUNT;
    return pack(x, y, b, c);
  }

  const dx = t.x - f.x;
  const dy = t.y - f.y; // + = target below
  const dist = Math.abs(dx);
  const tdir = dx >= 0 ? 1 : -1;
  const facingT = f.facing === tdir;

  // ---- shield reactions
  if (f.gnd >= 0 && (f.act === A.IDLE || f.act === A.WALK || f.act === A.DASH || f.act === A.RUN || f.act === A.CROUCH || f.act === A.SHIELD)) {
    const threat = (attacking(t) && dist < 190 + cfOf(t).height * 0.4 && Math.abs(dy) < 160) || st.projs.some((p) => p.o !== f.i && Math.abs(p.x - f.x) < 140 && Math.abs(p.y - (f.y - 50)) < 90 && (p.x - f.x) * p.vx < 0);
    if (threat && rnd(st, f, 10) < SHIELD[lvl]) {
      if (f.act !== A.SHIELD) {
        // high levels sometimes dodge instead
        const r = rnd(st, f, 11);
        if (lvl >= 6 && r < 0.18) return pack(0, -100, B_SHIELD, 0);
        if (lvl >= 5 && r < 0.3) return pack(-tdir * 100, 0, B_SHIELD, 0);
      }
      return pack(0, 0, B_SHIELD, 0);
    }
    if (f.act === A.SHIELD) {
      if (inEndlag(t) && dist < 150 && rnd(st, f, 12) < PUNISH[lvl]) return pack(0, 0, B_GRAB, 0);
      if (f.af > 10 + Math.floor((10 - lvl) * 2) || !attacking(t)) return pack(0, 0, 0, 0);
      return pack(0, 0, B_SHIELD, 0);
    }
  }

  // ---- think: choose a plan every `react` frames
  if (bm[3] > 0) bm[3]--;
  const think = bm[3] <= 0;
  if (think) bm[3] = react + Math.floor(rnd(st, f, 13) * react);
  if (think) bm[0] = rnd(st, f, 40) < IDLE[lvl] ? -1 : bm[0] === -1 ? P_NEUTRAL : bm[0];
  if (bm[0] === -1 && f.gnd >= 0) {
    // daydreaming: shuffle about, taunt now and then, but still turn to face whoever is close
    if (rnd(st, f, 41) < 0.004) return pack(0, 0, B_TAUNT, 0);
    const wander = st.frame % 120 < 50 ? (st.frame % 240 < 120 ? 40 : -40) : 0;
    const away = (f.x < edgeL + 120 && wander < 0) || (f.x > edgeR - 120 && wander > 0);
    return pack(away ? 0 : wander, 0, 0, 0);
  }

  // airborne offence
  if (f.gnd < 0 && f.act === A.AIR) {
    x = tdir * (dist > 60 ? 100 : 40);
    // fast fall when above the target and falling
    if (f.vy > 0 && dy > 40 && lvl >= 4 && !f.ff && rnd(st, f, 14) < 0.2) return pack(x, -100, 0, 0);
    const close = dist < 130 + cf.height * 0.3 && Math.abs(dy) < 150;
    if ((close || bm[0] === P_HOP) && (think || bm[0] === P_HOP) && rnd(st, f, 15) < 0.55 + lvl * 0.04) {
      bm[0] = P_NEUTRAL;
      let cd = 0;
      if (dy < -70 && Math.abs(dx) < 90) cd = C_UP;
      else if (dy > 70 && Math.abs(dx) < 90) cd = C_DOWN;
      else if (facingT) cd = tdir > 0 ? C_RIGHT : C_LEFT;
      else cd = tdir > 0 ? C_RIGHT : C_LEFT; // back air
      if (Math.abs(dx) < 50 && Math.abs(dy) < 60) return pack(0, 0, B_ATTACK, 0); // nair
      return pack(x, 0, 0, cd);
    }
    // don't drift off the stage chasing someone
    if ((f.x < edgeL + 60 && x < 0) || (f.x > edgeR - 60 && x > 0)) {
      if (!(t.x < edgeL || t.x > edgeR) || lvl < 6) x = 0;
    }
    return pack(x, y, b, c);
  }

  if (f.gnd < 0 || (f.act !== A.IDLE && f.act !== A.WALK && f.act !== A.DASH && f.act !== A.RUN && f.act !== A.CROUCH && f.act !== A.LAND && f.act !== A.BRAKE)) {
    // busy (mid-move): steer back toward the stage when offstage, otherwise keep drifting toward the target
    if (offstage && f.gnd < 0) {
      const side = f.x < center ? -1 : 1;
      const aim = (side < 0 ? edgeL : edgeR) + side * 40;
      const underNow = f.y > stage.y + 15 && (side < 0 ? f.x > edgeL - 30 : f.x < edgeR + 30);
      return pack(underNow ? side * 100 : aim > f.x ? 100 : -100, f.y > stage.y ? 40 : 0, b, 0);
    }
    return pack(bm[6] ?? 0, 0, b, 0);
  }

  // ---- platforms: drop through to chase someone below, jump after someone above
  if (f.gnd >= 0 && dy > 70 && dist < 420) {
    const sf = surfaces(STAGES[st.stage], st.frame, !!st.cfg.flat)[f.gnd];
    if (sf?.soft) return pack(0, iy(f.cur) < -30 ? 0 : -100, 0, 0);
  }
  if (f.gnd >= 0 && dy < -150 && dist < 260 && t.gnd >= 0 && think) {
    bm[0] = P_HOP;
    bm[5] = B_JUMP;
    bm[1] = 6;
    return pack(tdir * 40, 0, B_JUMP, 0);
  }

  // ---- ground: ultimate first
  if (f.ultReady && st.cfg.ult !== 'off' && dist < 600 && rnd(st, f, 16) < (lvl <= 2 ? 0.01 : 0.05 + lvl * 0.01)) return pack(0, 0, B_ULT, 0);

  // edge safety: don't run off
  const margin = 70 + Math.abs(f.vx) * 9;
  const nearEdge = (f.x < edgeL + margin && tdir < 0) || (f.x > edgeR - margin && tdir > 0);
  const tOff = t.x < edgeL - 20 || t.x > edgeR + 20 || t.y > stage.y + 40;

  const reachNow = 70 + cf.height * 0.45;
  if (!think) {
    // close and lined up: good CPUs pounce without waiting for their next "thought"
    const lined = dist < reachNow && Math.abs(dy) < 90 && facingT;
    if (!(lined && rnd(st, f, 31) < POUNCE[lvl])) {
      // keep closing the distance (but never run off the stage)
      if (dist > reachNow * 0.8 && bm[6] !== 0 && !nearEdge) x = MOVE_SPEED[lvl] < 100 ? tdir * MOVE_SPEED[lvl] : runToward(f, tdir);
      else x = 0;
      return pack(x, 0, b, 0);
    }
  }

  const heavyKill = t.dmg > 95 + (t.def >= 0 ? cfOf(t).def.weight - 100 : 0) * 0.5;
  const r = rnd(st, f, 17);
  // edge-guard: wait at the edge and smash when they come back
  if (tOff && lvl >= 5) {
    const ex = t.x < center ? edgeL + 40 : edgeR - 40;
    if (Math.abs(f.x - ex) > 40) {
      x = ex > f.x ? 80 : -80;
      bm[6] = x;
      return pack(x, 0, 0, 0);
    }
    if (Math.abs(t.y - stage.y) < 200 && Math.abs(dx) < 220 && r < EDGE[lvl]) return pack(0, 0, 0, tdir > 0 ? C_RIGHT : C_LEFT);
    if (r < 0.15 && cf.projIds.length) {
      f.facing = tdir;
      return pack(tdir * 30, 0, B_SPECIAL, 0);
    }
    bm[6] = 0;
    return pack(0, 0, 0, 0);
  }
  // in range
  const reach = 70 + cf.height * 0.45;
  if (dist < reach && Math.abs(dy) < 90) {
    if (t.act === A.SHIELD && r < 0.6 * Math.min(1, lvl / 4)) return pack(0, 0, B_GRAB, 0);
    if (inEndlag(t) || heavyKill) {
      if (rnd(st, f, 42) < SMASH[lvl]) {
        const q = r < 0.5 ? (dy < -40 ? C_UP : tdir > 0 ? C_RIGHT : C_LEFT) : r < 0.75 ? C_DOWN : tdir > 0 ? C_RIGHT : C_LEFT;
        return pack(0, 0, 0, q);
      }
      return pack(0, 0, B_ATTACK, 0);
    }
    // levels 1-2 only throw out light attacks
    if (lvl <= 2) return r < 0.6 ? pack(0, 0, B_ATTACK, 0) : pack(tdir * 60, 0, B_ATTACK, 0);
    if (r < 0.22) return pack(0, 0, B_ATTACK, 0);
    if (r < 0.42) return pack(tdir * 60, 0, B_ATTACK, 0);
    if (r < 0.55) return pack(0, -60, B_ATTACK, 0);
    if (r < 0.68) return pack(0, 0, B_GRAB, 0);
    if (r < 0.8) {
      // short hop aerial
      bm[0] = P_HOP;
      return pack(tdir * 50, 0, B_JUMP, 0);
    }
    if (r < 0.88) return pack(tdir * 60, 0, B_SPECIAL, 0);
    if (r < 0.94) return pack(0, -70, B_SPECIAL, 0);
    return pack(-tdir * 100, 0, B_SHIELD, 0);
  }
  // target just above us
  if (dy < -110 && dy > -230 && dist < 140) {
    if (r < 0.5) return pack(0, 0, 0, C_UP);
    return pack(0, 60, B_ATTACK, 0);
  }
  // mid range
  if (dist < 360) {
    if (r < 0.25 && !nearEdge) {
      bm[0] = P_HOP;
      bm[5] = B_JUMP;
      bm[1] = r < 0.12 ? 4 : 0;
      return pack(tdir * 100, 0, B_JUMP, 0);
    }
    if (r < 0.38 && (f.act === A.DASH || f.act === A.RUN) && facingT) return pack(tdir * 100, 0, B_ATTACK, 0);
    if (r < 0.5 && cf.projIds.length) return pack(0, 0, B_SPECIAL, 0);
    if (r < 0.56 && lvl >= 4) return pack(-tdir * 100, 0, 0, 0);
  } else if (r < 0.22 && cf.projIds.length) {
    if (!facingT) return pack(tdir * 40, 0, 0, 0);
    return pack(0, 0, B_SPECIAL, 0);
  }
  // approach: dash (flick from neutral) then run
  if (nearEdge) {
    bm[6] = 0;
    return pack(0, 0, 0, 0);
  }
  bm[6] = tdir * 100;
  return pack(MOVE_SPEED[lvl] < 100 ? tdir * MOVE_SPEED[lvl] : runToward(f, tdir), 0, 0, 0);
}
