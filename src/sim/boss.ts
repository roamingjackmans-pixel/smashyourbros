// The Big BROadcast: the studio's giant camera rig, final boss of the story (phase 2 after Max Ratings).
// It hovers behind the stage; its lens is the weak point. Attacks: a sweeping spotlight laser, a lens slam,
// falling cue cards, and "commercial breaks" that call in Stagehand Bots (handled by the story's waves).
import { A } from './acts';
import { applyHit, canTouch, hitCircle, isShielding } from './combat';
import { STAGES } from './data';
import { ev } from './events';
import { bodyH, cfOf } from './fighter';
import { dsin } from './math';
import { rint } from './rng';
import type { Skel, State } from './types';

export const BOSS_HP = 420;

export function bossFrame(st: State, skels: Skel[], init: boolean): void {
  const slot = st.cfg.players.findIndex((p) => p.boss === 'broadcast');
  if (slot < 0) return;
  const stg = STAGES[st.stage];
  if (init) {
    const hp = BOSS_HP * (st.cfg.players[slot].hpMult ?? 1);
    st.boss = { kind: 'broadcast', hp, maxHp: hp, x: 0, y: stg.solids[0].y1 - 430, phase: 0, act: 0, af: 0, hitlag: 0, flash: 0, v: [0, 0, 0, 0], dead: false };
    // the slot's fighter is parked out of the way (the boss is not a fighter)
    const f = st.fighters[slot];
    f.out = true;
    f.act = A.DEAD;
    return;
  }
  const b = st.boss;
  if (!b || b.dead) return;
  if (b.flash > 0) b.flash--;
  if (b.hitlag > 0) {
    b.hitlag--;
    return;
  }
  b.af++;
  const enraged = b.hp < b.maxHp * 0.4;
  // hover
  b.x = dsin(st.timer * 0.5) * 380;
  b.y = stg.solids[0].y1 - 430 + dsin(st.timer * 1.3) * 40;
  // ---- take hits on the lens
  const lens = { x: b.x, y: b.y + 20, r: 70 };
  for (const a of st.fighters) {
    if (a.act !== A.MOVE || a.out || a.hitlag > 0) continue;
    const m = cfOf(a).moves[a.mv];
    if (!m.hits) continue;
    for (let k = 0; k < m.hits.length; k++) {
      const h = m.hits[k];
      if (a.mf < h.f[0] || a.mf > h.f[1] || h.grab) continue;
      const bit = 1 << 7;
      if (a.hitMask[7] & bit && a.mf - a.hitAt[7] < (h.rehit ?? 999)) continue;
      const [cx, cy, cr] = hitCircle(skels[a.i], h);
      const dx = cx - lens.x;
      const dy = cy - lens.y;
      if (dx * dx + dy * dy > (cr + lens.r) * (cr + lens.r)) continue;
      a.hitMask[7] |= bit;
      a.hitAt[7] = a.mf;
      const d = h.dmg * (1 + (0.4 * a.charge) / 60);
      b.hp -= d;
      b.flash = 6;
      b.hitlag = Math.min(12, Math.floor(d * 0.5 + 3));
      a.hitlag = b.hitlag;
      a.st.dealt += d;
      ev(st, 'hit', cx, cy, a.i, d, 30, h.fx ?? 'hit');
      break;
    }
  }
  for (const p of st.projs) {
    if (p.dead) continue;
    const dx = p.x - lens.x;
    const dy = p.y - lens.y;
    if (dx * dx + dy * dy < (lens.r + 20) * (lens.r + 20)) {
      p.dead = true;
      b.hp -= 6;
      b.flash = 4;
      ev(st, 'hit', p.x, p.y, p.o, 6, 20, 'hit');
    }
  }
  if (b.hp <= 0) {
    b.dead = true;
    b.hp = 0;
    ev(st, 'bossdown', b.x, b.y, -1);
    return;
  }
  // ---- attacks
  const cycle = enraged ? 200 : 260;
  const t = b.af % cycle;
  if (t === 1) {
    b.act = rint(st, 3);
    ev(st, 'bosswarn', b.x, b.y, -1, b.act);
  }
  const top = stg.solids[0].y1;
  if (b.act === 0 && t > 50 && t < 150) {
    // spotlight laser sweeps across the floor
    const lx = stg.solids[0].x1 + ((t - 50) / 100) * (stg.solids[0].x2 - stg.solids[0].x1);
    b.v[0] = lx;
    for (const f of st.fighters) {
      if (!canTouch(st, null, f) || st.cfg.players[f.i]?.grunt) continue;
      if (Math.abs(f.x - lx) < 46 && f.y > top - 260 && f.lastHitT > 30) applyHit(st, null, f, { dmg: 11, ang: 80, bkb: 60, kbg: 45, fx: 'fire' }, { sx: lx, sy: f.y + 40, facing: f.x >= b.x ? 1 : -1, dmgMult: 1, kbMult: 1, proj: true, moveIdx: -1, shielded: isShielding(f) });
    }
  } else if (b.act === 1 && t === 90) {
    // lens slam shockwave
    for (const f of st.fighters) {
      if (!canTouch(st, null, f) || st.cfg.players[f.i]?.grunt) continue;
      if (Math.abs(f.x - b.x) < 300 && f.gnd >= 0) applyHit(st, null, f, { dmg: 14, ang: 60, bkb: 70, kbg: 60, fx: 'rock', away: true }, { sx: b.x, sy: top, facing: f.x >= b.x ? 1 : -1, dmgMult: 1, kbMult: 1, proj: true, moveIdx: -1, shielded: isShielding(f) });
    }
    ev(st, 'boom', b.x, top, -1, 300);
  } else if (b.act === 2 && t > 40 && t < 160 && t % (enraged ? 12 : 18) === 0) {
    // cue cards rain down
    const x = stg.solids[0].x1 + rint(st, Math.max(1, stg.solids[0].x2 - stg.solids[0].x1));
    st.hazards.push({ k: 'meteor', o: -1, x, y: stg.cam.t - 100, vx: 0, vy: 4, t: 40, life: 300, r: 26, dead: false });
  }
  void bodyH;
}
