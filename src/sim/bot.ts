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
  const offstage = f.x < edgeL - 10 || f.x > edgeR + 10 || f.y > stage.y + 30;
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
  const react = [0, 30, 24, 19, 15, 11, 8, 6, 4, 3][lvl];

  // ---- being hit: DI and tech
  if (f.act === A.HITSTUN || f.tumble) {
    if (rnd(st, f, 1) < lvl / 11) {
      // survival DI: toward the stage centre and up
      x = f.x < center ? 70 : -70;
      y = 70;
    }
    const nearGround = f.y > stage.y - 120 && f.y < stage.y + 5 && f.x > edgeL - 20 && f.x < edgeR + 20 && f.vy + f.ky > 0;
    if (nearGround && rnd(st, f, 2) < lvl / 12 - 0.05) b |= B_SHIELD;
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

  // ---- recovery
  if (offstage && f.gnd < 0 && f.act !== A.MOVE && f.act !== A.ADODGE) {
    const targetX = f.x < center ? edgeL : edgeR;
    const dir = targetX > f.x ? 1 : -1;
    x = dir * 100;
    const below = f.y - stage.y; // + = below the stage top
    const farX = Math.abs(f.x - targetX);
    bm[0] = P_RECOVER;
    if (f.act === A.HELPLESS) return pack(x, 0, 0, 0);
    if (f.jumps > 0 && (below > -40 || f.vy > 4) && f.vy > -3) {
      return pack(x, 0, B_JUMP, 0);
    }
    if (f.jumps === 0 && (below > 60 || (farX > 260 && below > -100)) && f.vy > -2) {
      // up special toward the ledge (side special first if far and the fighter has a recovery side B)
      if (farX > 330 && below < 120 && cf.moves[cf.moveIdx.sspec]?.oncePerAir && !(f.airUsed & (1 << (cf.moveIdx.sspec % 30)))) return pack(x, 0, B_SPECIAL, 0);
      return pack(dir * 60, 100, B_SPECIAL, 0);
    }
    return pack(x, 0, 0, 0);
  }

  // ---- holding someone: throw
  if (f.act === A.HOLD) {
    if (f.af < 6 + (10 - lvl) * 2) return pack(0, 0, 0, 0);
    const v = st.fighters[f.grabbing];
    if (!v) return pack(0, 0, 0, 0);
    if (f.af < 30 && v.dmg < 60 && rnd(st, f, 7) < 0.4 && st.frame % 12 === 0) return pack(0, 0, B_ATTACK, 0);
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
    if (threat && rnd(st, f, 10) < lvl / 13) {
      if (f.act !== A.SHIELD) {
        // high levels sometimes dodge instead
        const r = rnd(st, f, 11);
        if (lvl >= 6 && r < 0.18) return pack(0, -100, B_SHIELD, 0);
        if (lvl >= 5 && r < 0.3) return pack(-tdir * 100, 0, B_SHIELD, 0);
      }
      return pack(0, 0, B_SHIELD, 0);
    }
    if (f.act === A.SHIELD) {
      if (inEndlag(t) && dist < 150 && rnd(st, f, 12) < lvl / 10) return pack(0, 0, B_GRAB, 0);
      if (f.af > 10 + Math.floor((10 - lvl) * 2) || !attacking(t)) return pack(0, 0, 0, 0);
      return pack(0, 0, B_SHIELD, 0);
    }
  }

  // ---- think: choose a plan every `react` frames
  if (bm[3] > 0) bm[3]--;
  const think = bm[3] <= 0;
  if (think) bm[3] = react + Math.floor(rnd(st, f, 13) * react);

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
    if (offstage && f.gnd < 0) return pack(f.x < center ? 100 : -100, 0, b, 0);
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
  if (f.ultReady && st.cfg.ult !== 'off' && dist < 600 && rnd(st, f, 16) < 0.05 + lvl * 0.01) return pack(0, 0, B_ULT, 0);

  // edge safety: don't run off
  const margin = 70 + Math.abs(f.vx) * 9;
  const nearEdge = (f.x < edgeL + margin && tdir < 0) || (f.x > edgeR - margin && tdir > 0);
  const tOff = t.x < edgeL - 20 || t.x > edgeR + 20 || t.y > stage.y + 40;

  const reachNow = 70 + cf.height * 0.45;
  if (!think) {
    // close and lined up: good CPUs pounce without waiting for their next "thought"
    const lined = dist < reachNow && Math.abs(dy) < 90 && facingT;
    if (!(lined && rnd(st, f, 31) < lvl / 14)) {
      // keep closing the distance (but never run off the stage)
      if (dist > reachNow * 0.8 && bm[6] !== 0 && !nearEdge) x = runToward(f, tdir);
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
    if (Math.abs(t.y - stage.y) < 200 && Math.abs(dx) < 220 && r < 0.4) return pack(0, 0, 0, tdir > 0 ? C_RIGHT : C_LEFT);
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
    if (t.act === A.SHIELD && r < 0.6) return pack(0, 0, B_GRAB, 0);
    if (inEndlag(t) || heavyKill) {
      const q = r < 0.5 ? (dy < -40 ? C_UP : tdir > 0 ? C_RIGHT : C_LEFT) : r < 0.75 ? C_DOWN : tdir > 0 ? C_RIGHT : C_LEFT;
      return pack(0, 0, 0, q);
    }
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
  return pack(runToward(f, tdir), 0, 0, 0);
}
