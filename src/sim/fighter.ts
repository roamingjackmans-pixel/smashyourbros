// The fighter state machine: reading the stick and buttons, movement, jumps, dodges, shields, ledges, teching,
// starting and running moves, and stage collision. Hits are resolved in combat.ts.
import { A, GROUNDED } from './acts';
import { fighterScale, fighterSkel } from './anim';
import { FIGHTERS, STAGES, type CFighter } from './data';
import { ev } from './events';
import { B_ATTACK, B_GRAB, B_JUMP, B_SHIELD, B_SPECIAL, B_TAUNT, B_ULT, C_DOWN, C_LEFT, C_RIGHT, C_UP, ib, ic, ix, iy } from './input';
import { approach, clamp, dsin, sign } from './math';
import { mod } from './mods';
import { bonePoint } from './rig';
import { SCRIPTS } from './scripts';
import { ledges, moveBody, surfaces, type Surf } from './stage';
import { itemAttack, tryPickup } from './items';
import { spawnProj } from './projectiles';
import type { Fighter, MoveDef, State } from './types';

const FLICK = 4; // frames for a stick flick (smash input / dash / tap jump)
const BUF = 8; // input buffer frames
const TECH_WIN = 11;
const TECH_LOCK = 40;
const NORMAL_LAND = 3;
/** grounded normals stop at the stage edge (specials may carry you off on purpose) */
const EDGE_STOP_MOVES = new Set(['jab1', 'jab2', 'jab3', 'jab', 'ftilt', 'utilt', 'dtilt', 'dash', 'fsmash', 'usmash', 'dsmash', 'grab', 'dashgrab', 'pummel', 'fthrow', 'bthrow', 'uthrow', 'dthrow', 'getupatk', 'ledgeatk', 'itemSwing', 'itemSmash', 'itemDash', 'itemThrow', 'itemShoot', 'taunt']);

// ------------------------------------------------------------------ helpers

export function cfOf(f: Fighter): CFighter {
  return FIGHTERS[f.def];
}

export function surfs(st: State): Surf[] {
  return surfaces(STAGES[st.stage], st.frame, !!st.cfg.flat);
}

export function bodyH(st: State, f: Fighter): number {
  const cf = cfOf(f);
  return cf.height * fighterScale(st, f, cf) * 0.92;
}

export function bodyW(st: State, f: Fighter): number {
  const cf = cfOf(f);
  return cf.hw * fighterScale(st, f, cf);
}

function gravMul(st: State): number {
  return mod(st, 'lowgrav') ? 0.55 : mod(st, 'heavygrav') ? 1.55 : 1;
}

/** movement speed multiplier (items, paint, glue) */
export function speedMul(st: State, f: Fighter): number {
  let m = 1;
  if (f.speedT > 0) m *= 1.35;
  if (f.stuckT > 0) m *= 0.15;
  // Smudge's paint
  if (f.gnd >= 0) {
    for (let k = st.paint.length - 1; k >= 0; k--) {
      const p = st.paint[k];
      if (p.s === f.gnd && f.x >= p.x1 && f.x <= p.x2) {
        m *= st.fighters[p.owner] && (p.owner === f.i || (st.cfg.teams && st.fighters[p.owner].team === f.team)) ? 1.3 : 0.72;
        break;
      }
    }
  }
  // Tempo's Drop
  if (f.v[7] > 0 && cfOf(f).def.id === 'tempo') m *= 1.25;
  return m;
}

function held(f: Fighter, b: number): boolean {
  return (ib(f.cur) & b) !== 0;
}
function pressed(f: Fighter, b: number): boolean {
  return (ib(f.cur) & b) !== 0 && (ib(f.inp) & b) === 0;
}
/** a press within the buffer window that hasn't been used yet */
function buffered(f: Fighter, b: number): boolean {
  return (f.buf & b) !== 0 && f.bufT <= BUF;
}
function consume(f: Fighter, b: number): void {
  f.buf &= ~b;
}

export function sx(f: Fighter): number {
  return ix(f.cur);
}
export function sy(f: Fighter): number {
  return iy(f.cur);
}

/** fresh c-stick direction this frame (0 none) */
function cFresh(f: Fighter): number {
  const c = ic(f.cur);
  return c && c !== ic(f.inp) ? c : 0;
}

/** tap jump: a fresh flick up counts as Jump */
function jumpPress(st: State, f: Fighter): boolean {
  if (buffered(f, B_JUMP)) return true;
  const tap = st.cfg.players[f.i]?.tapJump;
  return !!tap && f.syT === 0 && f.syDir > 0;
}
function jumpHeld(st: State, f: Fighter): boolean {
  if (held(f, B_JUMP)) return true;
  const tap = st.cfg.players[f.i]?.tapJump;
  return !!tap && sy(f) >= 55;
}

// ------------------------------------------------------------------ input

export function readInput(f: Fighter, input: number): void {
  f.inp = f.cur;
  f.cur = input;
  const x = ix(input);
  const y = iy(input);
  // flick detection per axis
  if (Math.abs(x) < 30) f.xLowT = 0;
  else f.xLowT = Math.min(99, f.xLowT + 1);
  if (Math.abs(y) < 30) f.yLowT = 0;
  else f.yLowT = Math.min(99, f.yLowT + 1);
  const px = ix(f.inp);
  const py = iy(f.inp);
  f.sxT = Math.min(99, f.sxT + 1);
  f.syT = Math.min(99, f.syT + 1);
  if (Math.abs(x) >= 80 && (Math.abs(px) < 80 || sign(px) !== sign(x)) && f.xLowT <= FLICK) {
    f.sxT = 0;
    f.sxDir = sign(x);
  }
  if (Math.abs(y) >= 80 && (Math.abs(py) < 80 || sign(py) !== sign(y)) && f.yLowT <= FLICK) {
    f.syT = 0;
    f.syDir = sign(y);
  }
  // buffer new presses
  const nb = ib(input) & ~ib(f.inp);
  if (nb) {
    f.buf |= nb;
    f.bufT = 0;
  } else {
    f.bufT = Math.min(99, f.bufT + 1);
    if (f.bufT > BUF) f.buf = 0;
  }
  // tech press (shield) with lockout
  f.techT = Math.min(99, f.techT + 1);
  if (f.techLock > 0) f.techLock--;
  if (nb & B_SHIELD && f.techLock === 0) {
    f.techT = 0;
    f.techLock = TECH_LOCK;
  }
}

// ------------------------------------------------------------------ moves

export function moveDef(f: Fighter): MoveDef {
  return cfOf(f).moves[f.mv];
}

export function hasMove(f: Fighter, id: string): boolean {
  return cfOf(f).moveIdx[id] !== undefined;
}

export function startMove(st: State, f: Fighter, id: string): boolean {
  const cf = cfOf(f);
  const idx = cf.moveIdx[id];
  if (idx === undefined) return false;
  const m = cf.moves[idx];
  const wasGrounded = f.gnd >= 0;
  f.act = A.MOVE;
  f.mv = idx;
  f.mf = 1;
  f.af = 0;
  f.charge = 0;
  f.chargeHold = m.charge !== undefined;
  f.armorHits = 0;
  f.cancel = 0;
  f.a1 = m.loop ? 0 : f.a1;
  for (let i = 0; i < f.hitMask.length; i++) {
    f.hitMask[i] = 0;
    f.hitAt[i] = -999;
  }
  if (m.turn) {
    const x = sx(f);
    if (Math.abs(x) >= 30) f.facing = sign(x);
  }
  if (!m.keepMomentum && !wasGrounded && m.vel?.length) {
    /* air specials keep drift unless their vel keys say otherwise */
  }
  if (m.intang) f.intang = Math.max(f.intang, m.intang[1]);
  if (m.ult) {
    st.freeze = 50;
    st.freezeBy = f.i;
    f.meter = 0;
    f.ultReady = false;
    f.intang = Math.max(f.intang, m.frames + 50);
    f.st.ults++;
    ev(st, 'ult', f.x, f.y, f.i, 0, 0, cf.def.id);
  }
  if (m.oncePerAir && !wasGrounded) f.airUsed |= 1 << (idx % 30);
  ev(st, 'move', f.x, f.y, f.i, idx, 0, id);
  moveTick(st, f, m);
  return true;
}

function airUsed(f: Fighter, id: string): boolean {
  const idx = cfOf(f).moveIdx[id];
  if (idx === undefined) return false;
  const m = cfOf(f).moves[idx];
  return !!m.oncePerAir && (f.airUsed & (1 << (idx % 30))) !== 0;
}

/** per-frame effects of the current move frame: velocity keys, projectiles, scripts */
function moveTick(st: State, f: Fighter, m: MoveDef): void {
  const g = f.grav;
  if (m.vel) {
    for (const k of m.vel) {
      if (f.mf < k.f[0] || f.mf > k.f[1]) continue;
      if (k.vx !== undefined) f.vx = k.add ? f.vx + k.vx * f.facing : k.vx * f.facing;
      if (k.vy !== undefined) f.vy = k.add ? f.vy - k.vy * g : -k.vy * g;
    }
  }
  if (m.shots) {
    for (const s of m.shots) if (s.f === f.mf) shoot(st, f, s.proj, s.at, s.x ?? 0, s.y ?? 0, s.vx, s.vy);
  }
  if (m.sfx) for (const [fr, name] of m.sfx) if (fr === f.mf) ev(st, 'sfx', f.x, f.y, f.i, 0, 0, name);
  if (m.script) SCRIPTS[m.script]?.(st, f, m);
}

export function shoot(st: State, f: Fighter, proj: string, at: string | undefined, ox: number, oy: number, vx?: number, vy?: number): void {
  const cf = cfOf(f);
  const pk = cf.projIdx[proj];
  if (pk === undefined) return;
  const sk = fighterSkel(st, f, cf);
  const [px, py] = bonePoint(sk, at as never, ox, oy);
  spawnProj(st, f, pk, px, py, vx, vy);
}

function gravNow(f: Fighter, m: MoveDef | null): number {
  if (!m?.vel) return 1;
  for (const k of m.vel) if (f.mf >= k.f[0] && f.mf <= k.f[1] && k.grav !== undefined) return k.grav;
  return 1;
}
function noDriftNow(f: Fighter, m: MoveDef | null): boolean {
  if (!m?.vel) return false;
  for (const k of m.vel) if (f.mf >= k.f[0] && f.mf <= k.f[1] && k.noDrift) return true;
  return false;
}
function velSetNow(f: Fighter, m: MoveDef | null): boolean {
  if (!m?.vel) return false;
  for (const k of m.vel) if (f.mf >= k.f[0] && f.mf <= k.f[1] && k.vx !== undefined && !k.add) return true;
  return false;
}

function endMove(st: State, f: Fighter, m: MoveDef): void {
  if (f.gnd >= 0) {
    f.act = sy(f) <= -50 ? A.CROUCH : A.IDLE;
  } else {
    f.act = m.helpless ? A.HELPLESS : A.AIR;
    if (m.helpless) {
      f.helpless = true;
      f.landLag = m.landHelpless ?? 24;
    }
  }
  f.af = 0;
  f.mf = 0;
}

/** advance the current move one frame. Returns false if the move ended or switched. */
function runMove(st: State, f: Fighter): void {
  const cf = cfOf(f);
  const m = cf.moves[f.mv];
  // smash charge: hold the frame while Attack (or the smash stick) is held
  if (m.charge !== undefined && f.mf === m.charge && f.chargeHold) {
    const holding = held(f, B_ATTACK) || ic(f.cur) !== 0;
    if (holding && f.charge < 60) {
      f.charge++;
      if (f.charge % 8 === 1) ev(st, 'charge', f.x, f.y - bodyH(st, f) * 0.6, f.i);
      return;
    }
    f.chargeHold = false;
  }
  // special charge (Ray Blaster etc.)
  if (m.chargeB && f.mf === m.chargeB.at) {
    if (f.stored >= 1) {
      f.stored = 1;
      startMove(st, f, m.chargeB.release);
      return;
    }
    if (pressed(f, B_SHIELD) || (f.gnd < 0 && pressed(f, B_JUMP))) {
      // store the charge, cancel out
      ev(st, 'store', f.x, f.y, f.i, f.stored);
      endMove(st, f, m);
      consume(f, B_SHIELD);
      return;
    }
    if (held(f, B_SPECIAL)) {
      f.stored = Math.min(1, f.stored + 1 / m.chargeB.max);
      if (f.stored >= 1) ev(st, 'charged', f.x, f.y, f.i);
      return;
    }
    startMove(st, f, m.chargeB.release);
    return;
  }
  // chains (jab combos, multi-part specials)
  if (m.next) {
    for (const n of m.next) {
      const b = n.on === 'special' ? B_SPECIAL : B_ATTACK;
      if (f.mf >= n.from && f.mf <= n.to && buffered(f, b)) {
        consume(f, b);
        startMove(st, f, n.move);
        return;
      }
    }
  }
  // rapid jab loop
  if (m.loop && f.mf === m.loop.to) {
    const b = m.loop.on === 'special' ? B_SPECIAL : B_ATTACK;
    f.a1++;
    if (held(f, b) && f.a1 < (m.loop.max ?? 60)) {
      f.mf = m.loop.from;
      for (let i = 0; i < f.hitMask.length; i++) f.hitMask[i] = 0;
      moveTick(st, f, m);
      return;
    }
    if (m.loop.end) {
      startMove(st, f, m.loop.end);
      return;
    }
  }
  f.mf++;
  if (f.mf > m.frames) {
    endMove(st, f, m);
    return;
  }
  moveTick(st, f, m);
}

// ------------------------------------------------------------------ choosing actions

function stickDir(f: Fighter, dead = 50): 'up' | 'down' | 'fwd' | 'back' | 'n' {
  const x = sx(f);
  const y = sy(f);
  if (Math.abs(x) < dead && Math.abs(y) < dead) return 'n';
  if (Math.abs(y) >= Math.abs(x)) return y > 0 ? 'up' : 'down';
  return sign(x) === f.facing ? 'fwd' : 'back';
}

function cDir(f: Fighter, c: number): 'up' | 'down' | 'fwd' | 'back' | 'n' {
  if (c === C_UP) return 'up';
  if (c === C_DOWN) return 'down';
  if (c === C_RIGHT) return f.facing > 0 ? 'fwd' : 'back';
  if (c === C_LEFT) return f.facing < 0 ? 'fwd' : 'back';
  return 'n';
}

function tryUlt(st: State, f: Fighter): boolean {
  if (!f.ultReady || st.cfg.ult === 'off') return false;
  const both = (buffered(f, B_ATTACK) && buffered(f, B_SPECIAL)) || buffered(f, B_ULT);
  const orbSpecial = st.cfg.ult === 'orb' && buffered(f, B_SPECIAL) && stickDir(f) === 'n';
  if (!both && !orbSpecial) return false;
  consume(f, B_ATTACK | B_SPECIAL | B_ULT);
  return startMove(st, f, 'ult');
}

function trySpecial(st: State, f: Fighter, air: boolean): boolean {
  if (!buffered(f, B_SPECIAL)) return false;
  const d = stickDir(f, 45);
  let id = 'nspec';
  if (d === 'up') id = 'uspec';
  else if (d === 'down') id = 'dspec';
  else if (d === 'fwd' || d === 'back') {
    id = 'sspec';
    f.facing = sign(sx(f));
  }
  const airId = `${id}Air`;
  if (air && (airUsed(f, id) || airUsed(f, airId))) return false;
  consume(f, B_SPECIAL);
  if (air && hasMove(f, airId)) return startMove(st, f, airId);
  return startMove(st, f, id);
}

/** ground attack: smash / tilt / jab / dash attack */
function tryGroundAttack(st: State, f: Fighter): boolean {
  const c = cFresh(f);
  if (!buffered(f, B_ATTACK) && !c) return false;
  if (f.item >= 0 && itemAttack(st, f, c)) {
    consume(f, B_ATTACK);
    return true;
  }
  if (buffered(f, B_ATTACK) && f.item < 0 && tryPickup(st, f)) {
    consume(f, B_ATTACK);
    return true;
  }
  consume(f, B_ATTACK);
  if (c) {
    const d = cDir(f, c);
    if (d === 'up') return startMove(st, f, 'usmash') && smashed(f);
    if (d === 'down') return startMove(st, f, 'dsmash') && smashed(f);
    f.facing = c === C_RIGHT ? 1 : -1;
    return startMove(st, f, 'fsmash') && smashed(f);
  }
  const x = sx(f);
  const y = sy(f);
  const running = f.act === A.RUN || f.act === A.DASH;
  if (f.syT <= 3 && f.syDir > 0 && y >= 70) return startMove(st, f, 'usmash') && smashed(f);
  if (f.syT <= 3 && f.syDir < 0 && y <= -70) return startMove(st, f, 'dsmash') && smashed(f);
  if (running && !(f.act === A.DASH && f.af <= 1 && f.sxT <= 2 && sign(x) !== 0 && false)) {
    if (f.act === A.DASH && f.af <= 2) {
      // dash + attack on the same beat reads as a smash
      f.facing = f.sxDir || f.facing;
      return startMove(st, f, 'fsmash') && smashed(f);
    }
    return startMove(st, f, 'dash');
  }
  if (f.sxT <= 3 && Math.abs(x) >= 70) {
    f.facing = sign(x);
    return startMove(st, f, 'fsmash') && smashed(f);
  }
  if (y >= 40 && Math.abs(y) >= Math.abs(x)) return startMove(st, f, 'utilt');
  if (y <= -40 && Math.abs(y) >= Math.abs(x)) return startMove(st, f, 'dtilt');
  if (Math.abs(x) >= 35) {
    f.facing = sign(x);
    return startMove(st, f, 'ftilt');
  }
  return startMove(st, f, hasMove(f, 'jab1') ? 'jab1' : 'jab');
}

function smashed(f: Fighter): boolean {
  f.st.smashes++;
  return true;
}

function tryAerial(st: State, f: Fighter): boolean {
  const c = cFresh(f);
  if (!buffered(f, B_ATTACK) && !c && !f.hopAerial) return false;
  if (f.item >= 0 && itemAttack(st, f, c)) {
    consume(f, B_ATTACK);
    return true;
  }
  consume(f, B_ATTACK);
  f.hopAerial = false;
  const d = c ? cDir(f, c) : stickDir(f, 40);
  const id = d === 'up' ? 'uair' : d === 'down' ? 'dair' : d === 'fwd' ? 'fair' : d === 'back' ? 'bair' : 'nair';
  f.tumble = false;
  return startMove(st, f, id);
}

function groundOptions(st: State, f: Fighter, cf: CFighter): boolean {
  if (tryUlt(st, f)) return true;
  if (jumpPress(st, f)) {
    consume(f, B_JUMP);
    f.act = A.SQUAT;
    f.af = 0;
    f.shortHop = false;
    f.hopAerial = buffered(f, B_ATTACK) && held(f, B_JUMP);
    return true;
  }
  if (held(f, B_SHIELD) && f.act !== A.SHIELDOFF) {
    if (f.sxT <= 1 && Math.abs(sx(f)) >= 70) return roll(st, f, sign(sx(f)));
    if (f.syT <= 1 && sy(f) <= -70) return spot(st, f);
    consume(f, B_SHIELD);
    // "Shields Down" (FlashGames, D27): rolls and spot dodges still work, the bubble never comes up
    if (!mod(st, 'noshield')) {
      f.act = A.SHIELD;
      f.af = 0;
      f.shieldT = 0;
      ev(st, 'shieldon', f.x, f.y, f.i);
      return true;
    }
  }
  if (buffered(f, B_GRAB)) {
    consume(f, B_GRAB);
    if (f.item >= 0) return itemAttack(st, f, 0, true);
    const running = f.act === A.RUN || f.act === A.DASH;
    return startMove(st, f, running && hasMove(f, 'dashgrab') ? 'dashgrab' : 'grab');
  }
  if (trySpecial(st, f, false)) return true;
  if (tryGroundAttack(st, f)) return true;
  if (buffered(f, B_TAUNT)) {
    consume(f, B_TAUNT);
    f.act = A.TAUNT;
    f.af = 0;
    ev(st, 'taunt', f.x, f.y, f.i, cf.index);
    return true;
  }
  return false;
}

function airOptions(st: State, f: Fighter, cf: CFighter): boolean {
  if (tryUlt(st, f)) return true;
  if (jumpPress(st, f) && f.jumps > 0) {
    consume(f, B_JUMP);
    airJump(st, f, cf);
    return true;
  }
  if (buffered(f, B_SHIELD) && !f.dodged) {
    consume(f, B_SHIELD);
    airDodge(st, f);
    return true;
  }
  if (buffered(f, B_GRAB) && f.item >= 0) {
    consume(f, B_GRAB);
    return itemAttack(st, f, 0, true);
  }
  if (trySpecial(st, f, true)) return true;
  if (tryAerial(st, f)) return true;
  return false;
}

function airJump(st: State, f: Fighter, cf: CFighter): void {
  const s = cf.def.stats;
  f.jumps--;
  f.vy = -f.grav * s.djump * Math.sqrt(gravMul(st));
  f.vx = (sx(f) / 100) * s.airSpeed * speedMul(st, f);
  f.ky = 0;
  f.kx *= 0.5;
  f.ff = false;
  f.tumble = false;
  f.jumpKind = 2;
  f.act = A.AIR;
  f.af = 0;
  ev(st, 'djump', f.x, f.y, f.i);
}

function airDodge(st: State, f: Fighter): void {
  f.act = A.ADODGE;
  f.af = 0;
  f.dodged = true;
  f.tumble = false;
  const x = sx(f);
  const y = sy(f);
  const mag = Math.sqrt(x * x + y * y);
  if (mag >= 50) {
    f.a1 = x / mag;
    f.a2 = y / mag;
    f.vx = f.a1 * 13;
    f.vy = -f.a2 * 13;
    f.intang = 15;
  } else {
    f.a1 = 0;
    f.a2 = 0;
    f.vx *= 0.4;
    f.vy *= 0.3;
    f.intang = 25;
  }
  f.ff = false;
  ev(st, 'dodge', f.x, f.y, f.i);
}

function roll(st: State, f: Fighter, dir: number): boolean {
  f.act = A.ROLL;
  f.af = 0;
  f.a1 = dir;
  f.intang = 0;
  ev(st, 'roll', f.x, f.y, f.i);
  return true;
}
function spot(st: State, f: Fighter): boolean {
  f.act = A.SPOT;
  f.af = 0;
  ev(st, 'dodge', f.x, f.y, f.i);
  return true;
}

// ------------------------------------------------------------------ the frame

export function updateFighter(st: State, f: Fighter): void {
  const cf = cfOf(f);
  const s = cf.def.stats;
  f.af++;
  // timers
  if (f.intang > 0) f.intang--;
  if (f.invinc > 0) f.invinc--;
  if (f.ledgeLock > 0) f.ledgeLock--;
  if (f.dropT > 0) f.dropT--;
  if (f.giantT > 0) f.giantT--;
  if (f.tinyT > 0) f.tinyT--;
  if (f.speedT > 0) f.speedT--;
  if (f.starT > 0) f.starT--;
  if (f.stuckT > 0) f.stuckT--;
  if (f.burnT > 0) f.burnT--;
  if (f.counterT > 0) f.counterT--;
  if (f.lastHitT < 9999) f.lastHitT++;
  if (f.gravT > 0 && --f.gravT === 0 && f.grav < 0) flipGrav(st, f);
  if (cf.def.history) {
    // Echo's ghost trail: [x, y, dmg] each frame, 120 frames
    const n = 120;
    const k = (st.frame % n) * 3;
    f.hist[k] = f.x;
    f.hist[k + 1] = f.y;
    f.hist[k + 2] = f.dmg;
  }
  if (cf.def.passive) SCRIPTS[cf.def.passive]?.(st, f, null);

  if (f.act === A.DEAD) {
    if (f.out) return;
    if (--f.respawnT <= 0) respawn(st, f);
    return;
  }
  if (f.hitlag > 0) {
    f.hitlag--;
    // smash DI: nudge during hitlag with fresh flicks
    if (f.lSpd > 0 && (f.sxT === 0 || f.syT === 0)) {
      const nx = f.sxT === 0 ? f.sxDir : 0;
      const ny = f.syT === 0 ? -f.syDir : 0;
      const r = moveBody(surfs(st), f.x, f.y, nx * 5, f.gnd >= 0 ? 0 : ny * 5, bodyW(st, f), bodyH(st, f), f.grav, true);
      f.x = r.x;
      f.y = r.y;
    }
    if (f.hitlag === 0 && f.lSpd > 0) launch(st, f);
    return;
  }
  if (st.timeStop > 0 && st.timeStopBy !== f.i) return;
  if (f.frozenT > 0) {
    f.frozenT--;
    if (pressed(f, 0xff) || f.sxT === 0) f.frozenT = Math.max(0, f.frozenT - 3);
    physics(st, f, cf, false);
    return;
  }

  // ------------------------------------------------ action logic
  const act = f.act;
  switch (act) {
    case A.IDLE:
    case A.WALK:
    case A.CROUCH: {
      if (groundOptions(st, f, cf)) break;
      const x = sx(f);
      const y = sy(f);
      // platform drop
      if (f.dropPend > 0) {
        if (--f.dropPend === 0) {
          dropThrough(st, f);
          break;
        }
      } else if (f.syT === 0 && f.syDir < 0 && onSoft(st, f)) {
        f.dropPend = 3;
      }
      if (f.sxT <= 1 && Math.abs(x) >= 80 && act !== A.CROUCH) {
        f.facing = sign(x);
        f.act = A.DASH;
        f.af = 0;
        f.vx = s.dash * f.facing * speedMul(st, f);
        ev(st, 'dash', f.x, f.y, f.i);
        break;
      }
      if (y <= -55 && Math.abs(x) < 50) {
        if (act !== A.CROUCH) {
          f.act = A.CROUCH;
          f.af = 0;
        }
        break;
      }
      if (Math.abs(x) >= 22) {
        if (act !== A.WALK) {
          f.act = A.WALK;
          f.af = 0;
        }
        f.facing = sign(x);
        const target = (x / 100) * s.walk * speedMul(st, f);
        f.vx = approach(f.vx, target, s.groundFric * 1.5 * fric(st));
        break;
      }
      if (act !== A.IDLE) {
        f.act = A.IDLE;
        f.af = 0;
      }
      break;
    }
    case A.DASH: {
      const x = sx(f);
      // dash dance: a fresh flick the other way restarts the dash
      if (f.sxT === 0 && sign(x) === -f.facing) {
        f.facing = sign(x);
        f.af = 0;
        f.vx = s.dash * f.facing * speedMul(st, f);
        ev(st, 'dash', f.x, f.y, f.i);
        break;
      }
      if (groundOptions(st, f, cf)) break;
      f.vx = approach(f.vx, s.dash * f.facing * speedMul(st, f), 1.5);
      if (f.af >= s.dashFrames) {
        if (sign(x) === f.facing && Math.abs(x) >= 50) f.act = A.RUN;
        else f.act = A.BRAKE;
        f.af = 0;
      }
      break;
    }
    case A.RUN: {
      const x = sx(f);
      if (groundOptions(st, f, cf)) break;
      if (sign(x) === -f.facing && Math.abs(x) >= 50) {
        f.act = A.TURN;
        f.af = 0;
        ev(st, 'skid', f.x, f.y, f.i);
        break;
      }
      if (Math.abs(x) < 30) {
        f.act = A.BRAKE;
        f.af = 0;
        break;
      }
      if (sy(f) <= -60) {
        f.act = A.CROUCH;
        f.af = 0;
        break;
      }
      f.vx = approach(f.vx, s.run * f.facing * speedMul(st, f), 0.9);
      break;
    }
    case A.BRAKE: {
      if (f.af > 2 && groundOptions(st, f, cf)) break;
      f.vx = approach(f.vx, 0, s.groundFric * 1.2 * fric(st));
      if (f.af >= 10 || f.vx === 0) {
        f.act = A.IDLE;
        f.af = 0;
      }
      break;
    }
    case A.TURN: {
      f.vx = approach(f.vx, 0, s.groundFric * 2 * fric(st));
      if (f.af >= 9) {
        f.facing = -f.facing;
        f.act = Math.abs(sx(f)) >= 50 ? A.RUN : A.IDLE;
        f.af = 0;
      } else if (f.af > 3 && jumpPress(st, f)) {
        f.facing = -f.facing;
        groundOptions(st, f, cf);
      }
      break;
    }
    case A.SQUAT: {
      if (!jumpHeld(st, f)) f.shortHop = true;
      if (buffered(f, B_ATTACK)) f.hopAerial = true;
      if (f.af >= s.squat) {
        const full = !f.shortHop && jumpHeld(st, f);
        const v = full ? s.jump : s.hop;
        f.vy = -f.grav * v * Math.sqrt(gravMul(st));
        f.vx = clamp(f.vx * 0.85 + (sx(f) / 100) * 2.5, -s.airSpeed * 1.15 * speedMul(st, f), s.airSpeed * 1.15 * speedMul(st, f));
        f.gnd = -1;
        f.act = A.AIR;
        f.af = 0;
        f.jumpKind = 1;
        f.y -= f.grav * 1;
        ev(st, 'jump', f.x, f.y, f.i, full ? 1 : 0);
        if (f.hopAerial) {
          f.buf |= B_ATTACK;
          f.bufT = 0;
        }
      }
      break;
    }
    case A.LAND: {
      if (f.af >= f.landLag) {
        f.act = A.IDLE;
        f.af = 0;
        f.landLag = 0;
        groundOptions(st, f, cf);
      }
      break;
    }
    case A.AIR: {
      if (airOptions(st, f, cf)) break;
      airDrift(st, f, cf, 1);
      fastFall(st, f);
      // float: hold Jump while falling to hover (per airtime budget)
      if (s.float && f.floatT < s.float && held(f, B_JUMP) && f.vy * f.grav >= 0 && !f.ff) {
        f.floatT++;
        f.vy = 0.4 * f.grav;
      }
      break;
    }
    case A.HELPLESS: {
      airDrift(st, f, cf, 0.75);
      fastFall(st, f);
      break;
    }
    case A.MOVE: {
      const m = cf.moves[f.mv];
      if ((m.iasa && f.mf >= m.iasa) || f.cancel > 0) {
        if (f.gnd >= 0 ? groundOptions(st, f, cf) : airOptions(st, f, cf)) break;
      }
      // a flick right after a jab/tilt began upgrades it to a smash (keyboard players press both at once)
      if (f.gnd >= 0 && f.mf <= 2 && (f.sxT === 0 || f.syT === 0)) {
        const id = cf.moveIds[f.mv];
        if (id === 'jab1' || id === 'jab' || id === 'ftilt' || id === 'utilt' || id === 'dtilt') {
          if (f.syT === 0 && f.syDir > 0) {
            startMove(st, f, 'usmash') && smashed(f);
            break;
          }
          if (f.syT === 0 && f.syDir < 0) {
            startMove(st, f, 'dsmash') && smashed(f);
            break;
          }
          if (f.sxT === 0) {
            f.facing = f.sxDir;
            startMove(st, f, 'fsmash') && smashed(f);
            break;
          }
        }
      }
      // B-reverse / turnaround specials on the first frames
      if (m.reverse && f.mf <= 3 && Math.abs(sx(f)) >= 50 && sign(sx(f)) === -f.facing) {
        f.facing = -f.facing;
        if (f.gnd < 0) f.vx = -f.vx;
      }
      runMove(st, f);
      if (f.act === A.MOVE && f.gnd < 0) {
        const m2 = cf.moves[f.mv];
        if (!noDriftNow(f, m2) && !velSetNow(f, m2)) airDrift(st, f, cf, m2.helpless ? 0.7 : 1);
        if (m2.air) fastFall(st, f);
      }
      break;
    }
    case A.SHIELD: {
      f.shieldT++;
      f.shield -= 0.15;
      if (f.shield <= 0) {
        shieldBreak(st, f);
        break;
      }
      if (jumpPress(st, f)) {
        consume(f, B_JUMP);
        f.act = A.SQUAT;
        f.af = 0;
        f.shortHop = false;
        break;
      }
      if (buffered(f, B_GRAB) || buffered(f, B_ATTACK)) {
        consume(f, B_GRAB | B_ATTACK);
        if (f.syT <= 3 && sy(f) >= 70) startMove(st, f, 'usmash') && smashed(f);
        else startMove(st, f, 'grab');
        break;
      }
      if (buffered(f, B_SPECIAL) && sy(f) >= 50) {
        consume(f, B_SPECIAL);
        startMove(st, f, 'uspec');
        break;
      }
      if (cFresh(f) === C_UP) {
        startMove(st, f, 'usmash') && smashed(f);
        break;
      }
      if (f.sxT === 0 && Math.abs(sx(f)) >= 70) {
        roll(st, f, sign(sx(f)));
        break;
      }
      if (f.syT === 0 && sy(f) <= -70) {
        spot(st, f);
        break;
      }
      if (!held(f, B_SHIELD)) {
        f.act = A.SHIELDOFF;
        f.af = 0;
      }
      f.vx = approach(f.vx, 0, s.groundFric * fric(st));
      break;
    }
    case A.SHIELDSTUN: {
      f.vx = approach(f.vx, 0, s.groundFric * 0.6 * fric(st));
      if (f.af >= f.a1) {
        f.act = held(f, B_SHIELD) ? A.SHIELD : A.SHIELDOFF;
        f.af = 0;
      }
      break;
    }
    case A.SHIELDOFF: {
      f.vx = approach(f.vx, 0, s.groundFric * fric(st));
      if (jumpPress(st, f)) {
        consume(f, B_JUMP);
        f.act = A.SQUAT;
        f.af = 0;
        f.shortHop = false;
        break;
      }
      if (f.af >= 9) {
        f.act = A.IDLE;
        f.af = 0;
      }
      break;
    }
    case A.ROLL: {
      if (f.af === 4) f.intang = 13;
      f.vx = f.af >= 4 && f.af <= 20 ? f.a1 * 10.5 : approach(f.vx, 0, 2);
      if (f.af >= 30) {
        f.facing = -f.a1;
        f.act = A.IDLE;
        f.af = 0;
      }
      break;
    }
    case A.SPOT: {
      if (f.af === 2) f.intang = 15;
      f.vx = approach(f.vx, 0, 2);
      if (f.af >= 26) {
        f.act = A.IDLE;
        f.af = 0;
      }
      break;
    }
    case A.ADODGE: {
      const dirl = f.a1 !== 0 || f.a2 !== 0;
      if (dirl) {
        if (f.af < 16) {
          f.vx *= 0.9;
          f.vy *= 0.9;
        } else {
          f.vx *= 0.85;
          f.vy += s.grav * gravMul(st) * 0.5 * f.grav;
        }
      }
      if (f.af >= (dirl ? 34 : 28)) {
        f.act = A.AIR;
        f.af = 0;
        f.jumpKind = 0;
      }
      break;
    }
    case A.HITSTUN: {
      f.hitstun--;
      if (f.gnd >= 0) f.kx = approach(f.kx, 0, s.groundFric * 0.8);
      if (f.hitstun <= 0) {
        if (f.gnd >= 0) {
          f.act = A.IDLE;
          f.tumble = false;
          f.kx = 0;
        } else {
          f.act = A.AIR;
          f.jumpKind = 0;
          f.tumble = f.lTumble;
        }
        f.af = 0;
      }
      break;
    }
    case A.DOWN: {
      f.vx = approach(f.vx, 0, 1.5);
      f.kx = approach(f.kx, 0, 1.5);
      if (f.af > 24) {
        const x = sx(f);
        if (buffered(f, B_ATTACK) && hasMove(f, 'getupatk')) {
          consume(f, B_ATTACK);
          f.intang = 12;
          startMove(st, f, 'getupatk');
        } else if (Math.abs(x) >= 50 || buffered(f, B_SHIELD)) {
          f.act = A.GETROLL;
          f.af = 0;
          f.a1 = Math.abs(x) >= 50 ? sign(x) : -f.facing;
          f.intang = 26;
          consume(f, B_SHIELD);
        } else if (sy(f) >= 50 || buffered(f, B_JUMP) || f.af > 150) {
          f.act = A.GETUP;
          f.af = 0;
          f.intang = 22;
          consume(f, B_JUMP);
        }
      }
      break;
    }
    case A.GETUP:
      if (f.af >= 30) toIdle(f);
      break;
    case A.GETROLL:
      f.vx = f.af >= 4 && f.af <= 24 ? f.a1 * 7.5 : approach(f.vx, 0, 2);
      if (f.af >= 36) {
        f.facing = -f.a1;
        toIdle(f);
      }
      break;
    case A.TECH:
      f.vx = approach(f.vx, 0, 2);
      if (f.af >= 26) toIdle(f);
      break;
    case A.TECHROLL:
      f.vx = f.af >= 2 && f.af <= 26 ? f.a1 * 7 : approach(f.vx, 0, 2);
      if (f.af >= 40) {
        f.facing = -f.a1;
        toIdle(f);
      }
      break;
    case A.WALLTECH:
      f.vx = 0;
      f.vy = 0;
      if (f.af >= 14) {
        f.act = A.AIR;
        f.af = 0;
        f.jumpKind = 0;
      }
      break;
    case A.LEDGE:
      ledgeHang(st, f, cf);
      return;
    case A.LEDGEUP:
    case A.LEDGEROLL:
      ledgeClimb(st, f);
      return;
    case A.GRABBED:
      // position is set by the holder; mashing shortens the hold
      if ((ib(f.cur) & ~ib(f.inp)) || f.sxT === 0 || f.syT === 0) {
        const h = st.fighters[f.grabbedBy];
        if (h) h.grabT -= 3;
      }
      return;
    case A.HOLD: {
      const v = st.fighters[f.grabbing];
      if (!v || v.act !== A.GRABBED) {
        f.grabbing = -1;
        toIdle(f);
        break;
      }
      f.grabT--;
      f.vx = approach(f.vx, 0, 2);
      if (f.grabT <= 0) {
        grabRelease(st, f, v);
        break;
      }
      if (f.af < 4) break;
      if (buffered(f, B_ATTACK) && hasMove(f, 'pummel')) {
        consume(f, B_ATTACK);
        startMove(st, f, 'pummel');
        break;
      }
      const x = sx(f);
      const y = sy(f);
      const c = ic(f.cur);
      if (y >= 60 || c === C_UP) startMove(st, f, 'uthrow');
      else if (y <= -60 || c === C_DOWN) startMove(st, f, 'dthrow');
      else if ((Math.abs(x) >= 60 && sign(x) === f.facing) || (c === C_RIGHT && f.facing > 0) || (c === C_LEFT && f.facing < 0)) startMove(st, f, 'fthrow');
      else if (Math.abs(x) >= 60 || c === C_LEFT || c === C_RIGHT) startMove(st, f, 'bthrow');
      break;
    }
    case A.DIZZY: {
      if (f.gnd >= 0) {
        f.dizzyT--;
        if (pressed(f, 0xff) || f.sxT === 0) f.dizzyT -= 4;
        f.vx = approach(f.vx, 0, 1);
        if (f.dizzyT <= 0) {
          f.shield = 30;
          toIdle(f);
        }
      }
      break;
    }
    case A.TRAPPED: {
      f.trapT--;
      if (pressed(f, 0xff) || f.sxT === 0 || f.syT === 0) f.trapT -= 3;
      f.vx *= 0.9;
      f.vy *= 0.9;
      if (f.trapT <= 0) {
        f.act = A.AIR;
        f.af = 0;
        f.jumpKind = 0;
      }
      break;
    }
    case A.TAUNT:
      f.vx = approach(f.vx, 0, 2);
      if (f.af >= 60) toIdle(f);
      break;
    case A.PICKUP:
      if (f.af >= 6) toIdle(f);
      break;
    case A.RESPAWN: {
      f.vx = 0;
      f.vy = 0;
      const moved = Math.abs(sx(f)) >= 40 || Math.abs(sy(f)) >= 40 || (ib(f.cur) & ~ib(f.inp)) !== 0;
      if (moved || f.af > 300) {
        f.act = A.AIR;
        f.af = 0;
        f.jumpKind = 0;
        f.invinc = Math.max(f.invinc, 110);
        if (!moved) f.vy = 1;
        else airOptions(st, f, cf);
      }
      return;
    }
  }
  if (f.act === A.GRABBED || f.act === A.LEDGE) return;
  physics(st, f, cf, true);
}

function toIdle(f: Fighter): void {
  f.act = A.IDLE;
  f.af = 0;
}

function fric(st: State): number {
  return mod(st, 'ice') ? 0.12 : 1;
}

function onSoft(st: State, f: Fighter): boolean {
  if (f.gnd < 0) return false;
  const s = surfs(st)[f.gnd];
  return !!s && s.soft;
}

function dropThrough(st: State, f: Fighter): void {
  f.gnd = -1;
  f.dropT = 10;
  f.act = A.AIR;
  f.af = 0;
  f.jumpKind = 0;
  f.y += 2 * f.grav;
  f.vy = f.grav * 2;
  ev(st, 'drop', f.x, f.y, f.i);
}

function airDrift(st: State, f: Fighter, cf: CFighter, mult: number): void {
  const s = cf.def.stats;
  const x = sx(f);
  const max = s.airSpeed * mult * speedMul(st, f);
  if (Math.abs(x) > 12) {
    const target = (x / 100) * max;
    if (Math.abs(f.vx) > max && sign(f.vx) === sign(target)) f.vx = approach(f.vx, target, s.airFric);
    else f.vx = approach(f.vx, target, s.airAccel);
  } else f.vx = approach(f.vx, 0, s.airFric);
}

function fastFall(st: State, f: Fighter): void {
  if (f.ff) return;
  if (f.vy * f.grav > -1.5 && f.syT <= 1 && f.syDir < 0) {
    f.ff = true;
    ev(st, 'ff', f.x, f.y, f.i);
  }
}

function shieldBreak(st: State, f: Fighter): void {
  f.act = A.DIZZY;
  f.af = 0;
  f.dizzyT = Math.max(110, 300 - Math.floor(f.dmg));
  f.vy = -f.grav * 13;
  f.gnd = -1;
  f.shield = 0;
  ev(st, 'break', f.x, f.y, f.i);
}

export function flipGrav(st: State, f: Fighter): void {
  // standing on something: step clear of it so the body isn't flipped into the floor (or ceiling)
  if (f.gnd >= 0) f.y -= f.grav * bodyH(st, f);
  f.grav = -f.grav;
  f.gnd = -1;
  f.vy = -f.vy * 0.3;
  f.ff = false;
  if (f.act === A.LEDGE) {
    f.act = A.AIR;
    f.ledge = -1;
  }
  if (f.grav > 0) f.gravT = 0;
  ev(st, 'gflip', f.x, f.y, f.i, f.grav);
}

// ------------------------------------------------------------------ physics, landing, walls

function physics(st: State, f: Fighter, cf: CFighter, active: boolean): void {
  const s = cf.def.stats;
  const g = f.grav;
  const ss = surfs(st);
  const hw = bodyW(st, f);
  const h = bodyH(st, f);
  const m = f.act === A.MOVE ? cf.moves[f.mv] : null;
  // knockback decay
  const kl = Math.sqrt(f.kx * f.kx + f.ky * f.ky);
  if (kl > 0) {
    const nl = Math.max(0, kl - 0.46);
    f.kx = (f.kx * nl) / kl;
    f.ky = (f.ky * nl) / kl;
  }
  if (mod(st, 'wind') && f.act !== A.LEDGE) {
    const w = ((st.frame / 300) | 0) % 2 === 0 ? 1 : -1;
    if (st.frame % 600 > 120) f.x += w * (f.gnd >= 0 ? 0.7 : 1.3);
  }

  if (f.gnd >= 0) {
    const sf = ss[f.gnd];
    if (!sf) {
      f.gnd = -1;
    } else {
      // carried by moving platforms
      f.x += sf.dx;
      f.y = g > 0 ? sf.y1 : sf.y2;
      if (!velSetNow(f, m) && (f.act === A.IDLE || f.act === A.CROUCH || f.act === A.LAND || f.act === A.MOVE || f.act === A.HOLD || f.act === A.PICKUP)) {
        f.vx = approach(f.vx, 0, s.groundFric * fric(st));
      }
      // launched up off the ground
      if (f.vy * g < -0.5 || f.ky * g < -0.5) {
        f.gnd = -1;
      } else {
        f.vy = 0;
        if (f.ky * g > 0) f.ky = 0;
        const r = moveBody(ss, f.x, f.y, f.vx + f.kx, 0, hw, h, g, true);
        f.x = r.x;
        if (r.hit.wall) {
          f.vx = 0;
          if (f.act === A.HITSTUN) f.kx = -f.kx * 0.5;
        }
        if (!(f.x >= sf.x1 && f.x <= sf.x2)) {
          // edge: walking and standing stop (teeter); everything else slides off
          const stop = f.act === A.IDLE || f.act === A.WALK || f.act === A.CROUCH || f.act === A.SHIELD || f.act === A.SHIELDSTUN || f.act === A.SHIELDOFF || f.act === A.TAUNT || f.act === A.LAND || f.act === A.HOLD || f.act === A.SPOT || (m ? (m.edgeStop ?? EDGE_STOP_MOVES.has(cf.moveIds[f.mv])) : false);
          if (stop && f.act !== A.HITSTUN) {
            f.x = clamp(f.x, sf.x1, sf.x2);
            f.vx = 0;
          } else {
            f.gnd = -1;
            if (f.act === A.SQUAT || f.act === A.LAND || f.act === A.TURN || f.act === A.BRAKE || f.act === A.DASH || f.act === A.RUN || f.act === A.ROLL || f.act === A.GETROLL || f.act === A.TECHROLL || f.act === A.GETUP || f.act === A.TECH || f.act === A.DOWN || f.act === A.PICKUP) {
              f.act = A.AIR;
              f.af = 0;
              f.jumpKind = 0;
            }
          }
        }
        if (f.gnd >= 0) return;
      }
    }
  }

  // ---- airborne
  if (f.act === A.RESPAWN) return;
  const grav = s.grav * gravMul(st) * gravNow(f, m);
  const fallCap = (f.ff ? s.ffall : s.fall) * (mod(st, 'lowgrav') ? 0.75 : mod(st, 'heavygrav') ? 1.25 : 1);
  let fallV = f.vy * g;
  const moveOwnsVy = f.act === A.MOVE && gravNow(f, m) === 0;
  if (!moveOwnsVy && (f.act !== A.ADODGE || f.af > 16 || (f.a1 === 0 && f.a2 === 0))) {
    if (f.ff && fallV < fallCap && fallV > -1.5) fallV = fallCap;
    fallV = Math.min(fallCap, fallV + grav);
    if (f.act === A.ADODGE && f.a1 === 0 && f.a2 === 0) fallV = Math.min(fallV, 2);
  }
  f.vy = fallV * g;
  if (f.act === A.HITSTUN && f.gnd < 0) f.vx = approach(f.vx, 0, s.airFric);
  if (f.act === A.TRAPPED) {
    // bubbles float: no gravity, a gentle rise
    f.vy = -0.5 * g;
    f.ky = 0;
  }
  const prevKy = f.ky;
  const prevKx = f.kx;
  const r = moveBody(ss, f.x, f.y, f.vx + f.kx, f.vy + f.ky, hw, h, g, f.dropT > 0 || (f.act === A.HITSTUN && false));
  f.x = r.x;
  f.y = r.y;
  if (r.hit.wall) {
    if ((f.act === A.HITSTUN || f.tumble) && Math.abs(prevKx) > 5) {
      if (f.techT <= TECH_WIN) {
        f.act = A.WALLTECH;
        f.af = 0;
        f.kx = 0;
        f.ky = 0;
        f.intang = 12;
        f.st.techs++;
        ev(st, 'tech', f.x + r.hit.wall * hw, f.y - h / 2, f.i);
      } else {
        f.kx = -prevKx * 0.7;
        ev(st, 'bounce', f.x + r.hit.wall * hw, f.y - h / 2, f.i);
      }
    } else {
      f.vx = 0;
      f.kx = 0;
    }
  }
  if (r.hit.ceil) {
    if ((f.act === A.HITSTUN || f.tumble) && Math.abs(prevKy) > 5 && f.techT <= TECH_WIN) {
      f.act = A.WALLTECH;
      f.af = 0;
      f.kx = 0;
      f.ky = 0;
      f.intang = 12;
      f.st.techs++;
      ev(st, 'tech', f.x, f.y - h * g, f.i);
    } else {
      f.ky = -prevKy * 0.5;
      f.vy = 0;
    }
  }
  if (r.hit.land >= 0) land(st, f, cf, r.hit.land, Math.abs(prevKy + f.vy));
  if (active && f.gnd < 0) checkLedge(st, f, cf);
}

function land(st: State, f: Fighter, cf: CFighter, surf: number, speed: number): void {
  const wasAct = f.act;
  f.gnd = surf;
  f.jumps = cf.def.stats.jumps;
  f.dodged = false;
  f.ff = false;
  f.ledgeN = 0;
  f.airUsed = 0;
  f.floatT = 0;
  f.helpless = false;
  f.vy = 0;
  const kyDown = f.ky * f.grav;
  f.ky = 0;
  switch (wasAct) {
    case A.HITSTUN:
    case A.AIR:
    case A.DIZZY:
    case A.TRAPPED: {
      if (wasAct === A.DIZZY || wasAct === A.TRAPPED) {
        if (wasAct === A.TRAPPED) toIdle(f);
        return;
      }
      if (wasAct === A.HITSTUN && !f.lTumble) {
        // weak hit: slide out the rest of hitstun on the ground
        return;
      }
      if (f.tumble || wasAct === A.HITSTUN) {
        if (f.techT <= TECH_WIN) {
          const x = sx(f);
          f.kx = 0;
          f.vx = 0;
          f.tumble = false;
          f.hitstun = 0;
          f.st.techs++;
          if (Math.abs(x) >= 50) {
            f.act = A.TECHROLL;
            f.a1 = sign(x);
          } else f.act = A.TECH;
          f.af = 0;
          f.intang = 20;
          ev(st, 'tech', f.x, f.y, f.i);
          return;
        }
        if (kyDown > 10 && wasAct === A.HITSTUN) {
          // missed tech at speed: bounce once
          f.gnd = -1;
          f.ky = -kyDown * 0.45 * f.grav;
          f.y -= 2 * f.grav;
          ev(st, 'bounce', f.x, f.y, f.i);
          return;
        }
        f.act = A.DOWN;
        f.af = 0;
        f.tumble = false;
        f.hitstun = 0;
        f.kx *= 0.4;
        ev(st, 'knockdown', f.x, f.y, f.i);
        return;
      }
      f.act = A.LAND;
      f.af = 0;
      f.landLag = NORMAL_LAND;
      ev(st, 'land', f.x, f.y, f.i, speed);
      return;
    }
    case A.HELPLESS:
      f.act = A.LAND;
      f.af = 0;
      f.landLag = Math.max(NORMAL_LAND, f.landLag || 20);
      ev(st, 'land', f.x, f.y, f.i, speed);
      return;
    case A.ADODGE:
      f.act = A.LAND;
      f.af = 0;
      f.landLag = f.a1 !== 0 || f.a2 !== 0 ? 14 : 9;
      f.vx *= 0.6;
      ev(st, 'land', f.x, f.y, f.i, speed);
      return;
    case A.MOVE: {
      const m = cf.moves[f.mv];
      if (m.landInto) {
        startMove(st, f, m.landInto);
        return;
      }
      if (m.air) {
        const ac = m.autoCancel;
        const lag = ac && (f.mf < ac[0] || f.mf > ac[1]) ? NORMAL_LAND : (m.landLag ?? 8);
        f.act = A.LAND;
        f.af = 0;
        f.landLag = lag;
        ev(st, 'land', f.x, f.y, f.i, speed);
        return;
      }
      if (m.helpless && f.mf > Math.min(m.frames, 10)) {
        f.act = A.LAND;
        f.af = 0;
        f.landLag = m.landHelpless ?? 20;
        return;
      }
      // specials continue on the ground
      return;
    }
  }
}

// ------------------------------------------------------------------ ledges

function checkLedge(st: State, f: Fighter, cf: CFighter): void {
  if (f.grav < 0 || f.ledgeLock > 0) return;
  const act = f.act;
  const m = act === A.MOVE ? cf.moves[f.mv] : null;
  const canAct = act === A.AIR || act === A.HELPLESS || (m && m.ledgeFrom !== undefined && f.mf >= m.ledgeFrom);
  if (!canAct) return;
  if (f.vy * f.grav < -1 && act !== A.HELPLESS && !(m && m.ledgeFrom !== undefined)) return;
  if (f.tumble && f.hitstun > 0) return;
  const h = bodyH(st, f);
  const hw = bodyW(st, f);
  const L = ledges(surfs(st));
  for (let li = 0; li < L.length; li++) {
    const l = L[li];
    const dx = (f.x - l.x) * l.side; // + = outside the stage
    const dy = f.y - h * 0.82 - l.y; // hands relative to the ledge
    if (dx > -hw * 0.6 && dx < hw + 46 && dy > -46 && dy < 40) {
      // the far side (inside the stage, above it) is not a ledge grab
      if (dx < 0 && f.y < l.y) continue;
      grabLedge(st, f, li, l.side);
      return;
    }
  }
}

function grabLedge(st: State, f: Fighter, li: number, side: number): void {
  for (const o of st.fighters) {
    if (o !== f && o.act === A.LEDGE && o.ledge === li) {
      // trump: pop them off
      o.act = A.AIR;
      o.af = 0;
      o.ledge = -1;
      o.vx = side * 3;
      o.vy = -4;
      o.intang = 0;
      o.ledgeLock = 30;
      o.jumpKind = 0;
      ev(st, 'trump', o.x, o.y, o.i);
    }
  }
  f.act = A.LEDGE;
  f.af = 0;
  f.ledge = li;
  f.ledgeT = 0;
  f.facing = -side;
  f.vx = 0;
  f.vy = 0;
  f.kx = 0;
  f.ky = 0;
  f.jumps = cfOf(f).def.stats.jumps;
  f.dodged = false;
  f.helpless = false;
  f.ff = false;
  f.tumble = false;
  f.airUsed = 0;
  f.intang = Math.max(f.intang, [42, 24, 10, 0][Math.min(3, f.ledgeN)]);
  f.ledgeN++;
  f.gnd = -1;
  placeOnLedge(st, f);
  ev(st, 'ledge', f.x, f.y, f.i);
}

function placeOnLedge(st: State, f: Fighter): boolean {
  const l = ledges(surfs(st))[f.ledge];
  if (!l) return false;
  f.x = l.x + l.side * (bodyW(st, f) * 0.55 + 4);
  f.y = l.y + bodyH(st, f) * 0.8;
  return true;
}

function ledgeHang(st: State, f: Fighter, cf: CFighter): void {
  if (!placeOnLedge(st, f)) {
    f.act = A.AIR;
    f.ledge = -1;
    return;
  }
  f.ledgeT++;
  const l = ledges(surfs(st))[f.ledge];
  if (f.af < 8) return;
  const x = sx(f);
  const y = sy(f);
  const toward = sign(x) === -l.side && Math.abs(x) >= 50;
  const away = sign(x) === l.side && Math.abs(x) >= 50;
  const leave = (a: number): void => {
    f.act = a;
    f.af = 0;
    f.a1 = -l.side;
  };
  if (jumpPress(st, f)) {
    consume(f, B_JUMP);
    f.act = A.AIR;
    f.af = 0;
    f.ledge = -1;
    f.jumpKind = 1;
    f.vy = -cf.def.stats.jump * 0.95;
    f.vx = -l.side * 2.5;
    f.y = l.y - 4;
    f.x = l.x + l.side * 6;
    f.ledgeLock = 20;
    ev(st, 'jump', f.x, f.y, f.i, 1);
    return;
  }
  if (buffered(f, B_ATTACK) || buffered(f, B_SPECIAL)) {
    consume(f, B_ATTACK | B_SPECIAL);
    f.ledge = -1;
    f.x = l.x - l.side * (bodyW(st, f) + 6);
    f.y = l.y;
    f.gnd = l.surf;
    f.intang = 16;
    startMove(st, f, 'ledgeatk');
    return;
  }
  if (buffered(f, B_SHIELD)) {
    consume(f, B_SHIELD);
    leave(A.LEDGEROLL);
    f.intang = 30;
    return;
  }
  if (toward || y >= 50) {
    leave(A.LEDGEUP);
    f.intang = 22;
    return;
  }
  if (away || y <= -50 || f.ledgeT > 300) {
    f.act = A.AIR;
    f.af = 0;
    f.ledge = -1;
    f.jumpKind = 0;
    f.vx = l.side * 1.5;
    f.vy = 1;
    f.ledgeLock = 30;
    return;
  }
}

function ledgeClimb(st: State, f: Fighter): void {
  const l = ledges(surfs(st))[f.ledge];
  if (!l) {
    f.act = A.AIR;
    f.ledge = -1;
    return;
  }
  const roll = f.act === A.LEDGEROLL;
  const len = roll ? 40 : 30;
  const hangX = l.x + l.side * (bodyW(st, f) * 0.55 + 4);
  const hangY = l.y + bodyH(st, f) * 0.8;
  const topX = l.x - l.side * (bodyW(st, f) + 8);
  const endX = roll ? l.x - l.side * 170 : topX;
  const t1 = Math.min(1, f.af / 12);
  if (f.af <= 12) {
    f.x = hangX + (topX - hangX) * t1;
    f.y = hangY + (l.y - hangY) * t1;
  } else {
    const t2 = Math.min(1, (f.af - 12) / (len - 16));
    f.x = topX + (endX - topX) * t2;
    f.y = l.y;
  }
  if (f.af >= len) {
    f.act = A.IDLE;
    f.af = 0;
    f.gnd = l.surf;
    f.ledge = -1;
    f.facing = -l.side;
    f.x = endX;
    f.y = l.y;
  }
}

// ------------------------------------------------------------------ grabs

export function grabRelease(st: State, holder: Fighter, v: Fighter): void {
  holder.grabbing = -1;
  v.grabbedBy = -1;
  holder.act = A.LAND;
  holder.af = 0;
  holder.landLag = 18;
  holder.vx = -holder.facing * 4;
  v.act = A.AIR;
  v.af = 0;
  v.jumpKind = 0;
  v.gnd = -1;
  v.vx = holder.facing * 6;
  v.vy = -v.grav * 7;
  ev(st, 'release', v.x, v.y, v.i);
}

/** keep a grabbed fighter attached to the holder's hand */
export function attachGrabbed(st: State): void {
  for (const h of st.fighters) {
    if (h.grabbing < 0) continue;
    const v = st.fighters[h.grabbing];
    if (!v || v.act !== A.GRABBED) {
      h.grabbing = -1;
      continue;
    }
    const cf = cfOf(h);
    const m = h.act === A.MOVE ? cf.moves[h.mv] : null;
    const sk = fighterSkel(st, h, cf);
    const at = m?.throw?.holdAt ?? 'handF';
    const [px, py] = bonePoint(sk, at, m?.throw?.hx ?? 10, m?.throw?.hy ?? -10);
    v.x = px;
    v.y = py + bodyH(st, v) * 0.45 * v.grav;
    v.facing = -h.facing;
    v.vx = 0;
    v.vy = 0;
    v.kx = 0;
    v.ky = 0;
    v.gnd = -1;
  }
}

// ------------------------------------------------------------------ launch and respawn

/** apply the launch stored by a hit (after hitlag) */
export function launch(st: State, f: Fighter): void {
  let ang = f.lAng;
  // directional influence: perpendicular stick bends the launch up to 18 degrees
  const x = sx(f) / 100;
  const y = sy(f) / 100;
  const lx = dc(ang);
  const ly = ds(ang);
  const perp = x * -ly + y * lx;
  if (f.lSpd > 3) ang += 18 * clamp(perp, -1, 1);
  let spd = f.lSpd;
  // grounded meteor: bounce up
  if (f.gnd >= 0 && ds(ang) < -0.1) {
    ang = -ang;
    spd *= 0.8;
  }
  f.kx = dc(ang) * spd;
  f.ky = -ds(ang) * spd;
  f.vx = 0;
  f.vy = 0;
  f.ff = false;
  if (f.ky < -1 || f.lTumble) f.gnd = -1;
  f.lSpd = 0;
  if (f.lTumble) ev(st, 'launch', f.x, f.y, f.i, spd);
}

function ds(a: number): number {
  return dsin(a);
}
function dc(a: number): number {
  return dsin(a + 90);
}

export function respawn(st: State, f: Fighter): void {
  const stg = STAGES[st.stage];
  f.act = A.RESPAWN;
  f.af = 0;
  f.x = stg.respawn[0] + (f.i - 1.5) * 60;
  f.y = stg.respawn[1];
  f.vx = 0;
  f.vy = 0;
  f.kx = 0;
  f.ky = 0;
  f.gnd = -1;
  f.grav = 1;
  f.gravT = 0;
  f.dmg = st.cfg.players[f.i]?.handicap ?? 0;
  f.hp = st.cfg.hp * (st.cfg.players[f.i]?.hpMult ?? 1);
  f.jumps = cfOf(f).def.stats.jumps;
  f.dodged = false;
  f.helpless = false;
  f.invinc = 120;
  f.intang = 0;
  f.tumble = false;
  f.hitstun = 0;
  f.shield = 50;
  f.facing = f.x < 0 ? 1 : -1;
  f.item = -1;
  f.giantT = 0;
  f.tinyT = 0;
  f.frozenT = 0;
  f.trapT = 0;
  f.stuckT = 0;
  ev(st, 'respawn', f.x, f.y, f.i);
}

/** knocked out: called by the sim when a fighter leaves the blast zone or loses all stamina */
export function knockOut(st: State, f: Fighter, side: number): void {
  if (f.grabbing >= 0) {
    const v = st.fighters[f.grabbing];
    if (v) {
      v.act = A.AIR;
      v.grabbedBy = -1;
    }
    f.grabbing = -1;
  }
  if (f.grabbedBy >= 0) {
    const h = st.fighters[f.grabbedBy];
    if (h) {
      h.grabbing = -1;
      if (h.act === A.HOLD) h.act = A.IDLE;
    }
    f.grabbedBy = -1;
  }
  f.act = A.DEAD;
  f.af = 0;
  f.respawnT = 100;
  f.ledge = -1;
  f.hitlag = 0;
  f.lSpd = 0;
  f.kx = 0;
  f.ky = 0;
  f.vx = 0;
  f.vy = 0;
  f.item = -1;
  f.ultReady = st.cfg.ult === 'meter' ? f.ultReady : false;
  ev(st, 'ko', f.x, f.y, f.i, side);
}

export { GROUNDED };
