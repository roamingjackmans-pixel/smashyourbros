// Projectiles: movement, homing, boomerangs, bounces, rolling, fuses, puddles, paint, reflectors and hits.
import { A } from './acts';
import { applyHit, canTouch, circleHitsCapsules, hitCircle, hurtCapsules, isShielding, shieldCircle } from './combat';
import { FIGHTERS } from './data';
import { ev } from './events';
import { bodyH, cfOf, surfs } from './fighter';
import { datan2, dcos, dsin } from './math';
import { SCRIPTS } from './scripts';
import { cpuDamage } from './cpu';
import type { Fighter, HitProps, Proj, ProjDef, Skel, State } from './types';

export function projDef(p: Proj): ProjDef {
  return FIGHTERS[p.fd].projs[p.pk];
}

export function spawnProj(st: State, f: Fighter, pk: number, x: number, y: number, vx?: number, vy?: number): Proj {
  const d = FIGHTERS[f.def].projs[pk];
  const p: Proj = {
    id: st.nextId++,
    o: f.i,
    fd: f.def,
    pk,
    x,
    y,
    vx: (vx ?? d.vx ?? 0) * f.facing,
    vy: -(vy ?? d.vy ?? 0) * f.grav,
    age: 0,
    life: d.life,
    facing: f.facing,
    hits: d.hits ?? 1,
    hitMask: 0,
    hitAt: [-999, -999, -999, -999, -999, -999, -999, -999],
    hp: d.hp ?? 0,
    charge: d.chargeable ? f.stored : 0,
    dead: false,
    gnd: false,
    v0: 0,
    v1: 1,
  };
  if (d.chargeable) f.stored = 0;
  st.projs.push(p);
  ev(st, 'proj', x, y, f.i, p.id, pk, d.kind);
  return p;
}

function scale(p: Proj, d: ProjDef): number {
  return d.chargeable ? 1 + p.charge * 0.9 : 1;
}

function hitProps(p: Proj, d: ProjDef): HitProps {
  if (p.v0 === 1 && d.puddle) return d.puddle.hit;
  return d.hit;
}

function explode(st: State, p: Proj, d: ProjDef): void {
  if (!d.explode) return;
  const o = st.fighters[p.o];
  for (const t of st.fighters) {
    if (!canTouch(st, o ?? null, t)) continue;
    const dx = t.x - p.x;
    const dy = t.y - bodyH(st, t) * 0.5 - p.y;
    const r = d.explode.r + 30;
    if (dx * dx + dy * dy > r * r) continue;
    applyHit(st, o ?? null, t, d.explode.hit, { sx: p.x, sy: p.y + 20, facing: dx >= 0 ? 1 : -1, dmgMult: p.v1, kbMult: 1, proj: true, moveIdx: -1, shielded: isShielding(t) && !d.explode.hit.unblockable });
  }
  ev(st, 'boom', p.x, p.y, p.o, d.explode.r);
}

function kill(st: State, p: Proj, d: ProjDef): void {
  if (p.dead) return;
  p.dead = true;
  if (d.explode && !d.fuse) explode(st, p, d);
  ev(st, 'projend', p.x, p.y, p.o, p.id, 0, d.kind);
}

function addPaint(st: State, surf: number, x: number, owner: number, w: number): void {
  const x1 = x - w;
  const x2 = x + w;
  for (const q of st.paint) {
    if (q.s === surf && q.owner === owner && x2 >= q.x1 - 10 && x1 <= q.x2 + 10) {
      q.x1 = Math.min(q.x1, x1);
      q.x2 = Math.max(q.x2, x2);
      q.t = 720;
      return;
    }
  }
  // paint over other people's paint
  for (const q of st.paint) {
    if (q.s !== surf || q.owner === owner) continue;
    if (x1 <= q.x1 && x2 >= q.x2) q.t = 0;
    else if (x1 > q.x1 && x2 < q.x2) {
      st.paint.push({ s: q.s, x1: x2, x2: q.x2, owner: q.owner, t: q.t });
      q.x2 = x1;
    }
    else if (x1 <= q.x1 && x2 > q.x1) q.x1 = x2;
    else if (x2 >= q.x2 && x1 < q.x2) q.x2 = x1;
  }
  st.paint.push({ s: surf, x1, x2, owner, t: 720 });
  if (st.paint.length > 24) st.paint.shift();
}

export function paintAt(st: State, surf: number, x: number, owner: number, w = 50): void {
  addPaint(st, surf, x, owner, w);
}

export function updateProjs(st: State, skels: Skel[]): void {
  const ss = surfs(st);
  for (const p of st.projs) {
    if (p.dead) continue;
    const d = projDef(p);
    if (st.timeStop > 0 && st.timeStopBy !== p.o) continue;
    p.age++;
    if (p.age > p.life) {
      if (d.fuse && d.explode) explode(st, p, d);
      kill(st, p, d);
      continue;
    }
    if (d.fuse && p.age === d.fuse) {
      explode(st, p, d);
      kill(st, p, d);
      continue;
    }
    const owner = st.fighters[p.o];
    // homing
    if (d.homing && p.v0 === 0) {
      let best: Fighter | null = null;
      let bd = 1e12;
      for (const t of st.fighters) {
        if (!canTouch(st, owner ?? null, t)) continue;
        const dx = t.x - p.x;
        const dy = t.y - bodyH(st, t) * 0.5 - p.y;
        const dd = dx * dx + dy * dy;
        if (dd < bd) {
          bd = dd;
          best = t;
        }
      }
      if (best) {
        const spd = Math.sqrt(p.vx * p.vx + p.vy * p.vy);
        const cur = datan2(-p.vy, p.vx);
        const want = datan2(-(best.y - bodyH(st, best) * 0.5 - p.y), best.x - p.x);
        let diff = want - cur;
        while (diff > 180) diff -= 360;
        while (diff < -180) diff += 360;
        const na = cur + Math.max(-d.homing, Math.min(d.homing, diff));
        p.vx = dcos(na) * spd;
        p.vy = -dsin(na) * spd;
      }
    }
    // boomerang: come back to the owner
    if (d.boomerang && p.age > d.boomerang && owner) {
      const dx = owner.x - p.x;
      const dy = owner.y - bodyH(st, owner) * 0.5 - p.y;
      const l = Math.sqrt(dx * dx + dy * dy) || 1;
      p.vx += (dx / l) * 0.9;
      p.vy += (dy / l) * 0.9;
      const sp = Math.sqrt(p.vx * p.vx + p.vy * p.vy);
      if (sp > 14) {
        p.vx = (p.vx / sp) * 14;
        p.vy = (p.vy / sp) * 14;
      }
      if (l < 40) {
        kill(st, p, d);
        continue;
      }
    }
    // pull bros in (gravity well, whirlpool)
    if (d.pull) {
      for (const t of st.fighters) {
        if (!canTouch(st, owner ?? null, t)) continue;
        const dx = p.x - t.x;
        const dy = p.y - (t.y - bodyH(st, t) * 0.5);
        const dd = Math.sqrt(dx * dx + dy * dy);
        if (dd < 220 && dd > 10) {
          t.x += (dx / dd) * d.pull;
          if (t.gnd < 0) t.y += (dy / dd) * d.pull * 0.7;
        }
      }
    }
    if (d.grav && !p.gnd) p.vy += d.grav;
    if (d.drag) {
      p.vx *= d.drag;
      p.vy *= d.drag;
    }
    // ---- move against the stage
    const r = d.r * scale(p, d);
    if (d.ghost || d.boomerang) {
      p.x += p.vx;
      p.y += p.vy;
    } else if (p.v0 === 1 || (p.gnd && d.stick)) {
      /* resting */
    } else {
      const nx = p.x + p.vx;
      const ny = p.y + p.vy;
      let hitS = -1;
      let side = false;
      for (let i = 0; i < ss.length; i++) {
        const s = ss[i];
        if (s.soft) {
          if (p.vy > 0 && p.y <= s.y1 && ny + r * 0.5 >= s.y1 && nx >= s.x1 && nx <= s.x2 && (d.roll || d.bounce || d.stick || d.puddle || d.paint)) hitS = i;
          continue;
        }
        if (nx + r * 0.5 > s.x1 && nx - r * 0.5 < s.x2 && ny + r * 0.5 > s.y1 && ny - r * 0.5 < s.y2) {
          hitS = i;
          side = p.y + r * 0.5 > s.y1 + 2 && p.y - r * 0.5 < s.y2 - 2;
          break;
        }
      }
      if (hitS >= 0) {
        const s = ss[hitS];
        if (side) {
          if (d.bounce || d.roll) {
            p.vx = -p.vx * 0.7;
            p.x += p.vx;
          } else {
            kill(st, p, d);
            continue;
          }
        } else if (p.vy >= 0) {
          // landed on top
          if (d.paint) {
            paintAt(st, hitS, nx, p.o, 70 * scale(p, d));
            ev(st, 'splat', nx, s.y1, p.o);
            kill(st, p, d);
            continue;
          }
          if (d.puddle) {
            p.v0 = 1;
            p.x = nx;
            p.y = s.y1 - 4;
            p.vx = 0;
            p.vy = 0;
            p.life = p.age + d.puddle.life;
            p.hits = 999;
            p.hitMask = 0;
            continue;
          }
          if (d.bounce && Math.abs(p.vy) > 2) {
            p.y = s.y1 - r * 0.5;
            p.vy = -p.vy * d.bounce;
            p.x = nx;
            continue;
          }
          if (d.roll) {
            p.y = s.y1 - r;
            p.vy = 0;
            p.x = nx;
            p.gnd = true;
            continue;
          }
          if (d.stick) {
            p.y = s.y1 - r * 0.5;
            p.x = nx;
            p.vx = 0;
            p.vy = 0;
            p.gnd = true;
            continue;
          }
          kill(st, p, d);
          continue;
        } else {
          if (d.bounce) {
            p.vy = -p.vy * 0.6;
            continue;
          }
          kill(st, p, d);
          continue;
        }
      } else {
        p.x = nx;
        p.y = ny;
        if (p.gnd && d.roll) {
          // fell off an edge
          let still = false;
          for (const s of ss) if (!s.soft && p.x >= s.x1 && p.x <= s.x2 && Math.abs(p.y + r - s.y1) < 3) still = true;
          if (!still) p.gnd = false;
        }
      }
    }
    // out of the world
    if (p.y > 3000 || p.y < -3000 || p.x < -4000 || p.x > 4000) {
      p.dead = true;
      continue;
    }
    // ---- pulse (speakers)
    if (d.pulse && p.age % d.pulse.every === 0) {
      for (const t of st.fighters) {
        if (!canTouch(st, owner ?? null, t)) continue;
        const caps = hurtCapsules(skels[t.i], cfOf(t));
        if (!circleHitsCapsules(p.x, p.y, d.pulse.r, caps)) continue;
        applyHit(st, owner ?? null, t, d.pulse.hit, { sx: p.x, sy: p.y, facing: t.x >= p.x ? 1 : -1, dmgMult: 1, kbMult: 1, proj: true, moveIdx: -1, shielded: isShielding(t) && !d.pulse.hit.unblockable });
      }
      ev(st, 'pulse', p.x, p.y, p.o, d.pulse.r);
    }
    // ---- hits on fighters
    if (d.pulse && !d.hit.dmg) continue;
    for (const t of st.fighters) {
      if (p.dead) break;
      if (!canTouch(st, owner ?? null, t)) continue;
      if (t.act === A.GRABBED) continue;
      const bit = 1 << t.i;
      const rehit = p.v0 === 1 ? 30 : d.rehit;
      if (p.hitMask & bit) {
        if (!rehit || st.frame - p.hitAt[t.i] < rehit) continue;
      }
      const hp = hitProps(p, d);
      if (p.v0 === 1 && t.gnd < 0) continue;
      const tcf = cfOf(t);
      // reflectors
      if (t.act === A.MOVE && d.reflectable !== false) {
        const tm = tcf.moves[t.mv];
        if (tm.reflect && t.mf >= tm.reflect.f[0] && t.mf <= tm.reflect.f[1]) {
          const [rx, ry, rr] = hitCircle(skels[t.i], { f: [0, 0], at: tm.reflect.at, x: tm.reflect.x, y: tm.reflect.y, r: tm.reflect.r, dmg: 0, ang: 0, bkb: 0, kbg: 0 });
          const dx = p.x - rx;
          const dy = p.y - ry;
          if (dx * dx + dy * dy <= (rr + r) * (rr + r)) {
            p.o = t.i;
            p.vx = -p.vx * (tm.reflect.mult ?? 1.2);
            p.vy = -p.vy * 0.4;
            p.facing = -p.facing;
            p.hitMask = 0;
            p.v1 *= tm.reflect.mult ?? 1.2;
            p.life = Math.max(p.life, p.age + 90);
            ev(st, 'reflect', p.x, p.y, t.i);
            break;
          }
        }
      }
      let shielded = false;
      if (isShielding(t) && !hp.unblockable) {
        const [sx, sy, sr] = shieldCircle(st, t, tcf);
        const dx = p.x - sx;
        const dy = p.y - sy;
        if (dx * dx + dy * dy <= (r + sr) * (r + sr)) shielded = true;
      }
      if (!shielded) {
        const caps = hurtCapsules(skels[t.i], tcf);
        const rx = p.v0 === 1 && d.puddle ? d.puddle.w : r;
        if (!circleHitsCapsules(p.x, p.y, rx, caps)) continue;
      }
      p.hitMask |= bit;
      p.hitAt[t.i] = st.frame;
      let mult = (d.chargeable ? 1 + p.charge * 1.6 : 1) * p.v1 * (owner ? (FIGHTERS[owner.def].def.power ?? 1) * cpuDamage(st.cfg.players[owner.i]) : 1);
      let kbm = d.chargeable ? 1 + p.charge * 0.5 : 1;
      let fxo: string | undefined;
      const hook = owner ? SCRIPTS[`${FIGHTERS[owner.def].def.id}:mult`] : undefined;
      if (owner && hook) {
        const out = { dmg: 1, kb: 1, fx: undefined as string | undefined, proj: true };
        hook(st, owner, null, out);
        mult *= out.dmg;
        kbm *= out.kb;
        fxo = out.fx;
      }
      const res = applyHit(st, owner ?? null, t, hp, { sx: p.x - (p.vx >= 0 ? 30 : -30), sy: p.y, facing: p.vx === 0 ? (t.x >= p.x ? 1 : -1) : p.vx > 0 ? 1 : -1, dmgMult: mult, kbMult: kbm, proj: true, moveIdx: -1, shielded, fxOverride: fxo });
      if (res === 'hit' && d.trap) {
        t.act = A.TRAPPED;
        t.trapT = d.trap;
        t.hitlag = 0;
        t.lSpd = 0;
        t.af = 0;
        t.gnd = -1;
        t.vy = -1.5;
      }
      if (d.fuse && d.explode && !d.pierce) {
        explode(st, p, d);
        p.dead = true;
        ev(st, 'projend', p.x, p.y, p.o, p.id, 0, d.kind);
        break;
      }
      if (!d.pierce && p.v0 !== 1) {
        p.hits--;
        if (p.hits <= 0) {
          kill(st, p, d);
          break;
        }
      }
    }
  }
  // projectiles cancel each other
  for (let i = 0; i < st.projs.length; i++) {
    const a = st.projs[i];
    if (a.dead || a.v0 === 1) continue;
    const da = projDef(a);
    if (da.pulse || da.stick) continue;
    for (let j = i + 1; j < st.projs.length; j++) {
      const b = st.projs[j];
      if (b.dead || b.o === a.o || b.v0 === 1) continue;
      const db = projDef(b);
      if (db.pulse || db.stick) continue;
      const rr = da.r * scale(a, da) + db.r * scale(b, db);
      const dx = a.x - b.x;
      const dy = a.y - b.y;
      if (dx * dx + dy * dy > rr * rr) continue;
      const pa = da.hit.dmg * (da.chargeable ? 1 + a.charge * 1.6 : 1);
      const pb = db.hit.dmg * (db.chargeable ? 1 + b.charge * 1.6 : 1);
      if (pa <= pb + 3) kill(st, a, da);
      if (pb <= pa + 3) kill(st, b, db);
      ev(st, 'clank', (a.x + b.x) / 2, (a.y + b.y) / 2, -1);
    }
  }
  // fighters' hitboxes break destructible projectiles (speakers)
  for (const p of st.projs) {
    if (p.dead || p.hp <= 0) continue;
    for (const a of st.fighters) {
      if (a.i === p.o || a.act !== A.MOVE) continue;
      const m = cfOf(a).moves[a.mv];
      if (!m.hits) continue;
      for (const h of m.hits) {
        if (a.mf < h.f[0] || a.mf > h.f[1] || h.grab) continue;
        const [cx, cy, cr] = hitCircle(skels[a.i], h);
        const d = projDef(p);
        const dx = cx - p.x;
        const dy = cy - p.y;
        const moveStart = st.frame - a.mf;
        if (dx * dx + dy * dy <= (cr + d.r) * (cr + d.r) && p.hitAt[4 + a.i] !== moveStart) {
          p.hitAt[4 + a.i] = moveStart;
          p.hp -= h.dmg;
          ev(st, 'hit', p.x, p.y, a.i, h.dmg, 10, 'hit');
          if (p.hp <= 0) kill(st, p, d);
          break;
        }
      }
    }
  }
  // paint dries
  for (const q of st.paint) q.t--;
  if (st.paint.some((q) => q.t <= 0 || q.x2 <= q.x1)) st.paint = st.paint.filter((q) => q.t > 0 && q.x2 > q.x1);
  if (st.projs.some((p) => p.dead)) st.projs = st.projs.filter((p) => !p.dead);
}
