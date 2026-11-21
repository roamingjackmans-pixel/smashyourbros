// Items: spawning, picking up, holding, throwing, swinging, shooting, eating, and the special ones (orb, coins,
// springs, glue, mystery boxes, guest-star capsules). All original, all a little bit bro.
import { A } from './acts';
import { fighterSkel } from './anim';
import { applyHit, canTouch, circleHitsCapsules, hitCircle, hurtCapsules, isShielding } from './combat';
import { STAGES } from './data';
import { ev } from './events';
import { bodyH, bodyW, cfOf, hasMove, startMove, surfs } from './fighter';
import { C_DOWN, C_LEFT, C_RIGHT, C_UP, ix, iy } from './input';
import { dsin as dsinS, sign } from './math';
import { mod } from './mods';
import { bonePoint } from './rig';
import { nextU32, rint } from './rng';
import { moveBody } from './stage';
import { registerScripts } from './scripts';
import type { Fighter, HitProps, Item, Skel, State } from './types';

export type ItemKind = 'throw' | 'melee' | 'shoot' | 'food' | 'buff' | 'place' | 'box' | 'assist' | 'orb' | 'coin';

export interface ItemDef {
  id: string;
  name: string;
  kind: ItemKind;
  blurb: string;
  r: number;
  /** spawn weight (0 = never randomly) */
  w: number;
  power?: number;
  kbPow?: number;
  ammo?: number;
  hit?: HitProps;
  heal?: number;
  /** thrown: explodes on contact */
  boom?: { r: number; hit: HitProps };
  roll?: boolean;
  boomerang?: boolean;
}

const H = (dmg: number, ang: number, bkb: number, kbg: number, fx: HitProps['fx'] = 'hit', extra: Partial<HitProps> = {}): HitProps => ({ dmg, ang, bkb, kbg, fx, ...extra });

export const ITEMS: ItemDef[] = [
  { id: 'fizz', name: 'Fizz Bomb', kind: 'throw', blurb: 'Shaken, not stirred. Explodes on contact.', r: 16, w: 10, hit: H(4, 45, 30, 50), boom: { r: 110, hit: H(19, 60, 60, 82, 'fire') } },
  { id: 'chicken', name: 'Rubber Chicken', kind: 'melee', blurb: 'Squeaks. Hurts feelings and percent.', r: 18, w: 9, power: 1.05, kbPow: 1.05, hit: H(6, 361, 20, 60) },
  { id: 'mic', name: 'Karaoke Mic Stand', kind: 'melee', blurb: 'For power ballads to your bro. Also hitting.', r: 20, w: 7, power: 1.4, kbPow: 1.25, hit: H(8, 361, 30, 70) },
  { id: 'bat', name: 'Foam Finger Bat', kind: 'melee', blurb: '#1 BRO. The smash attack sends bros to the moon.', r: 20, w: 3, power: 1.1, kbPow: 1.9, hit: H(7, 361, 30, 70) },
  { id: 'mallet', name: 'Squeaky Mallet', kind: 'melee', blurb: 'Bonk. Bonk. Bonk.', r: 22, w: 4, power: 1.7, kbPow: 1.45, hit: H(10, 361, 40, 75) },
  { id: 'popcorn', name: 'Golden Popcorn', kind: 'food', blurb: 'Heals 25%. Share with your bro (you won’t).', r: 14, w: 6, heal: 25 },
  { id: 'wings', name: 'Hot Wings', kind: 'food', blurb: 'Heals 12%. Spicy like your bromance.', r: 14, w: 7, heal: 12 },
  { id: 'hype', name: 'Hype Juice', kind: 'buff', blurb: 'Speed for 10 seconds. Zero calories, all vibes.', r: 14, w: 6 },
  { id: 'protein', name: 'Mega Protein Shake', kind: 'buff', blurb: 'Instant gains. Become huge for 10 seconds.', r: 16, w: 5 },
  { id: 'star', name: 'Gold Star Sticker', kind: 'buff', blurb: 'You did great, bro! Invincible for 8 seconds.', r: 16, w: 3 },
  { id: 'shrink', name: 'Shrink Ray', kind: 'shoot', blurb: 'Zap your bro down to travel size.', r: 16, w: 4, ammo: 4, hit: H(3, 30, 20, 30, 'magic') },
  { id: 'freeze', name: 'Freeze Ray', kind: 'shoot', blurb: 'Chill out, bro. No, literally.', r: 16, w: 4, ammo: 5, hit: H(5, 40, 20, 40, 'ice', { freeze: 70 }) },
  { id: 'cannon', name: 'Party Cannon', kind: 'shoot', blurb: 'Confetti at point blank. Celebrate them off the stage.', r: 18, w: 5, ammo: 6, hit: H(4, 30, 55, 60, 'wind') },
  { id: 'laser', name: 'Laser Pointer', kind: 'shoot', blurb: 'For presentations about why you’re the best bro.', r: 14, w: 5, ammo: 14, hit: H(2, 0, 4, 10, 'magic') },
  { id: 'pie', name: 'Cream Pie', kind: 'throw', blurb: 'Pie to the face. A classic expression of love.', r: 16, w: 7, hit: H(9, 50, 40, 55, 'food', { freeze: 30 }) },
  { id: 'remote', name: 'TV Remote', kind: 'throw', blurb: 'Comes back like your bro after a fight.', r: 14, w: 6, hit: H(7, 45, 30, 60), boomerang: true },
  { id: 'bowling', name: 'Bowling Ball', kind: 'throw', blurb: 'Strike! Rolls along the floor.', r: 18, w: 5, hit: H(15, 40, 50, 80, 'rock'), roll: true },
  { id: 'glue', name: 'Glue Trap', kind: 'place', blurb: 'Sticky situation. Bros who step in it stay stuck.', r: 18, w: 5 },
  { id: 'spring', name: 'Spring Pad', kind: 'place', blurb: 'Boing. Sends bros sky-high.', r: 20, w: 4 },
  { id: 'box', name: 'Mystery Box', kind: 'box', blurb: 'Could be anything. Probably a bomb.', r: 24, w: 5 },
  { id: 'capsule', name: 'Guest Star Capsule', kind: 'assist', blurb: 'A celebrity cameo! Usually a roadie.', r: 16, w: 4 },
  { id: 'orb', name: 'Ultimate Orb', kind: 'orb', blurb: 'Break it to unleash your ultimate.', r: 26, w: 0 },
  { id: 'coin', name: 'Coin', kind: 'coin', blurb: '', r: 10, w: 0 },
];
export const ITEM_INDEX: Record<string, number> = {};
ITEMS.forEach((d, i) => (ITEM_INDEX[d.id] = i));

function newItem(st: State, k: number, x: number, y: number): Item {
  const it: Item = { id: st.nextId++, k, x, y, vx: 0, vy: 0, st: 0, h: -1, o: -1, t: 0, hp: ITEMS[k].kind === 'orb' ? 40 : 0, uses: ITEMS[k].ammo ?? 0, gnd: false, hitMask: 0, dead: false, v0: 0 };
  st.items.push(it);
  return it;
}

export function spawnItemAt(st: State, id: string, x: number, y: number): Item {
  return newItem(st, ITEM_INDEX[id], x, y);
}

/** random spawn over the stage */
function spawnRandom(st: State): void {
  const pool: number[] = [];
  let total = 0;
  ITEMS.forEach((d) => {
    if (d.w > 0) {
      pool.push(d.w);
      total += d.w;
    } else pool.push(0);
  });
  let r = rint(st, total);
  let k = 0;
  for (; k < pool.length; k++) {
    if (r < pool[k]) break;
    r -= pool[k];
  }
  const stg = STAGES[st.stage];
  const main = stg.solids[0];
  const x = main.x1 + 80 + rint(st, Math.max(1, main.x2 - main.x1 - 160));
  const it = newItem(st, k, x, stg.cam.t + 200);
  ev(st, 'itemspawn', it.x, it.y, -1, k);
}

export function itemsFrame(st: State, skels: Skel[]): void {
  // ---- spawning
  const freq = st.cfg.items;
  if (freq > 0 && st.intro <= 0 && !st.over) {
    const every = [0, 900, 560, 330][Math.min(3, freq)] / (mod(st, 'itemrain') ? 4 : 1);
    st.itemT++;
    const live = st.items.filter((i) => ITEMS[i.k].kind !== 'coin' && ITEMS[i.k].kind !== 'orb').length;
    if (st.itemT >= every && live < 6) {
      st.itemT = 0;
      spawnRandom(st);
    }
  }
  if (st.cfg.ult === 'orb' && st.intro <= 0 && !st.over) {
    const any = st.items.some((i) => ITEMS[i.k].kind === 'orb') || st.fighters.some((f) => f.ultReady);
    if (!any) {
      st.orbT++;
      if (st.orbT > 1200) {
        st.orbT = 0;
        const stg = STAGES[st.stage];
        const it = newItem(st, ITEM_INDEX.orb, 0, stg.cam.t + 300);
        it.st = 3;
        ev(st, 'orb', it.x, it.y, -1);
      }
    }
  }
  const ss = surfs(st);
  for (const it of st.items) {
    if (it.dead) continue;
    const d = ITEMS[it.k];
    it.t++;
    if (d.kind === 'orb') {
      orbFloat(st, it, skels);
      continue;
    }
    if (it.st === 1) {
      // held: rides the holder's hand
      const h = st.fighters[it.h];
      if (!h || h.item !== it.id || h.act === A.DEAD) {
        it.st = 0;
        it.h = -1;
        if (h && h.item === it.id) h.item = -1;
        continue;
      }
      const [px, py] = bonePoint(skels[h.i], 'handF', 4, 0);
      it.x = px;
      it.y = py;
      continue;
    }
    // ---- free / thrown physics
    if (!it.gnd || it.st === 2) {
      if (!(d.boomerang && it.st === 2)) it.vy = Math.min(16, it.vy + 0.65);
      const r = moveBody(ss, it.x, it.y, it.vx, it.vy, d.r * 0.7, d.r * 1.2, 1, it.st === 2 && it.t < 6);
      it.x = r.x;
      it.y = r.y;
      if (r.hit.wall) it.vx = -it.vx * 0.5;
      if (r.hit.land >= 0) {
        if (it.st === 2) {
          if (d.boom) {
            itemBoom(st, it, d);
            continue;
          }
          if (d.id === 'pie' || d.id === 'capsule') {
            if (d.id === 'capsule') guestStar(st, it);
            else ev(st, 'splat', it.x, it.y, it.o);
            it.dead = true;
            continue;
          }
          if (d.id === 'box' && Math.abs(it.vy) > 6) {
            openBox(st, it);
            continue;
          }
          if (d.roll) {
            it.vy = 0;
            it.gnd = true;
            it.vx *= 0.995;
            if (Math.abs(it.vx) < 1) it.st = 0;
            continue;
          }
          if (d.kind === 'place') {
            it.st = 3;
            it.vx = 0;
            it.vy = 0;
            it.gnd = true;
            ev(st, 'place', it.x, it.y, it.o, it.k);
            continue;
          }
          it.st = 0;
        }
        if (Math.abs(it.vy) > 4 && it.st !== 2) it.vy = -it.vy * 0.3;
        else {
          it.vy = 0;
          it.gnd = true;
          it.vx *= 0.7;
        }
      }
    }
    if (it.gnd) {
      // still on something?
      let on = false;
      for (const s of ss) if (it.x >= s.x1 && it.x <= s.x2 && Math.abs(it.y - (s.soft ? s.y1 : s.y1)) < 3) on = true;
      if (!on && it.st !== 3) it.gnd = false;
      it.vx *= 0.85;
      if (it.st !== 2) it.x += it.vx;
    }
    if (it.y > STAGES[st.stage].blast.b) it.dead = true;
    // despawn idle items after 20 s (coins after 8 s)
    if (it.st === 0 && it.t > (d.kind === 'coin' ? 480 : 1200)) {
      it.dead = true;
      ev(st, 'itemgone', it.x, it.y, -1);
    }
    // ---- contact effects
    if (it.st === 2) thrownHits(st, it, d, skels);
    if (it.st === 3) placedEffects(st, it, d, skels);
    if (it.st === 0 && (d.kind === 'coin' || d.id === 'star')) touchPickup(st, it, d);
  }
  if (st.items.some((i) => i.dead)) st.items = st.items.filter((i) => !i.dead);
}

function orbFloat(st: State, it: Item, skels: Skel[]): void {
  const stg = STAGES[st.stage];
  const cx = (stg.cam.l + stg.cam.r) / 2;
  const w = (stg.cam.r - stg.cam.l) * 0.32;
  // a slow figure-eight over the stage
  const t = it.t;
  it.x = cx + w * dsinS(t * 0.6);
  it.y = stg.cam.t + 360 + 140 * dsinS(t * 1.2 + 40);
  for (const a of st.fighters) {
    if (a.act !== A.MOVE || a.out) continue;
    const m = cfOf(a).moves[a.mv];
    if (!m.hits) continue;
    for (const h of m.hits) {
      if (a.mf < h.f[0] || a.mf > h.f[1] || h.grab) continue;
      if (it.hitMask & (1 << a.i) && it.t - it.v0 < 12) continue;
      const [cx2, cy, cr] = hitCircle(skels[a.i], h);
      const dx = cx2 - it.x;
      const dy = cy - it.y;
      if (dx * dx + dy * dy <= (cr + 26) * (cr + 26)) {
        it.hp -= h.dmg;
        it.hitMask |= 1 << a.i;
        it.v0 = it.t;
        ev(st, 'hit', it.x, it.y, a.i, h.dmg, 20, 'magic');
        if (it.hp <= 0) {
          it.dead = true;
          a.ultReady = true;
          ev(st, 'ultready', a.x, a.y, a.i);
          ev(st, 'orbbreak', it.x, it.y, a.i);
        }
        break;
      }
    }
  }
}

function itemBoom(st: State, it: Item, d: (typeof ITEMS)[number]): void {
  it.dead = true;
  const o = st.fighters[it.o] ?? null;
  for (const t of st.fighters) {
    if (t.out || t.act === A.DEAD || t.intang > 0 || t.invinc > 0 || t.starT > 0) continue;
    const dx = t.x - it.x;
    const dy = t.y - bodyH(st, t) * 0.5 - it.y;
    if (dx * dx + dy * dy > (d.boom!.r + 30) * (d.boom!.r + 30)) continue;
    applyHit(st, o && o.i !== t.i ? o : null, t, d.boom!.hit, { sx: it.x, sy: it.y + 30, facing: dx >= 0 ? 1 : -1, dmgMult: 1, kbMult: 1, proj: true, moveIdx: -1, shielded: isShielding(t) });
  }
  ev(st, 'boom', it.x, it.y, it.o, d.boom!.r);
}

function thrownHits(st: State, it: Item, d: (typeof ITEMS)[number], skels: Skel[]): void {
  const o = st.fighters[it.o] ?? null;
  if (d.boomerang && it.t > 34 && o) {
    const dx = o.x - it.x;
    const dy = o.y - bodyH(st, o) * 0.5 - it.y;
    const l = Math.sqrt(dx * dx + dy * dy) || 1;
    it.vx += (dx / l) * 1.1;
    it.vy += (dy / l) * 1.1;
    const sp = Math.sqrt(it.vx * it.vx + it.vy * it.vy);
    if (sp > 15) {
      it.vx = (it.vx / sp) * 15;
      it.vy = (it.vy / sp) * 15;
    }
    if (l < 40 || it.t > 160) {
      it.st = 0;
      it.vx = 0;
      it.vy = 0;
      if (l < 40 && o.item < 0 && o.act !== A.DEAD) {
        o.item = it.id;
        it.st = 1;
        it.h = o.i;
      }
      return;
    }
  }
  for (const t of st.fighters) {
    if (o && t.i === o.i && it.t < 40) continue;
    if (!canTouch(st, o && o.i !== t.i ? o : null, t)) continue;
    if (it.hitMask & (1 << t.i)) continue;
    const caps = hurtCapsules(skels[t.i], cfOf(t));
    if (!circleHitsCapsules(it.x, it.y, d.r, caps)) continue;
    it.hitMask |= 1 << t.i;
    if (d.boom) {
      itemBoom(st, it, d);
      return;
    }
    const speed = Math.sqrt(it.vx * it.vx + it.vy * it.vy);
    const hp: HitProps = d.hit ?? H(Math.min(14, 3 + speed * 0.5), 45, 30, 50);
    applyHit(st, o && o.i !== t.i ? o : null, t, hp, { sx: it.x - sign(it.vx) * 20, sy: it.y, facing: it.vx >= 0 ? 1 : -1, dmgMult: Math.min(1.4, 0.6 + speed / 22), kbMult: 1, proj: true, moveIdx: -1, shielded: isShielding(t) });
    if (d.id === 'pie') {
      it.dead = true;
      ev(st, 'splat', it.x, it.y, it.o);
      return;
    }
    if (d.id === 'box') {
      openBox(st, it);
      return;
    }
    if (d.id === 'capsule') {
      guestStar(st, it);
      it.dead = true;
      return;
    }
    if (!d.roll && !d.boomerang) {
      it.vx = -it.vx * 0.3;
      it.vy = -5;
      it.st = 0;
    }
  }
}

function placedEffects(st: State, it: Item, d: (typeof ITEMS)[number], skels: Skel[]): void {
  for (const t of st.fighters) {
    if (t.out || t.act === A.DEAD) continue;
    const near = Math.abs(t.x - it.x) < d.r + bodyW(st, t) * 0.6 && Math.abs(t.y - it.y) < 24;
    if (!near) continue;
    if (d.id === 'spring' && t.vy >= 0 && t.act !== A.LEDGE) {
      t.gnd = -1;
      t.vy = -27;
      t.jumps = cfOf(t).def.stats.jumps;
      t.dodged = false;
      t.ff = false;
      if (t.act === A.HELPLESS || t.act === A.LAND || t.act === A.IDLE || t.act === A.WALK || t.act === A.RUN || t.act === A.DASH) {
        t.act = A.AIR;
        t.af = 0;
        t.jumpKind = 2;
      }
      ev(st, 'spring', it.x, it.y, t.i);
      it.uses++;
      if (it.uses > 6) it.dead = true;
    }
    if (d.id === 'glue' && t.gnd >= 0 && t.i !== it.o && t.starT <= 0) {
      t.stuckT = 150;
      it.dead = true;
      ev(st, 'stuck', t.x, t.y, t.i);
      return;
    }
  }
  void skels;
  if (it.t > 1500) it.dead = true;
}

function touchPickup(st: State, it: Item, d: (typeof ITEMS)[number]): void {
  for (const f of st.fighters) {
    if (f.out || f.act === A.DEAD) continue;
    if (Math.abs(f.x - it.x) > bodyW(st, f) + d.r || f.y < it.y - 10 - bodyH(st, f) || f.y > it.y + 40) continue;
    if (d.kind === 'coin') {
      if (it.o === f.i && it.t < 40) continue;
      f.coins++;
      it.dead = true;
      ev(st, 'coin', it.x, it.y, f.i);
      return;
    }
    if (d.id === 'star') {
      f.starT = 480;
      it.dead = true;
      f.st.items++;
      ev(st, 'buff', f.x, f.y, f.i, it.k);
      return;
    }
  }
}

/** Attack (or Grab) pressed while holding an item. Returns true if the item handled it. */
export function itemAttack(st: State, f: Fighter, c: number, grabBtn = false): boolean {
  const it = st.items.find((i) => i.id === f.item);
  if (!it) {
    f.item = -1;
    return false;
  }
  const d = ITEMS[it.k];
  const x = ix(f.cur);
  const y = iy(f.cur);
  const smash = f.sxT <= 3 || f.syT <= 3 || c !== 0;
  if (!grabBtn && d.kind === 'melee') {
    if (f.gnd < 0) return startMove(st, f, 'itemAir');
    if (f.act === A.DASH || f.act === A.RUN) return startMove(st, f, 'itemDash');
    if (smash && Math.abs(x) >= 60) f.facing = sign(x);
    if (c === C_LEFT) f.facing = -1;
    if (c === C_RIGHT) f.facing = 1;
    return startMove(st, f, smash ? 'itemSmash' : 'itemSwing');
  }
  if (!grabBtn && d.kind === 'shoot' && it.uses > 0) {
    if (Math.abs(x) >= 60) f.facing = sign(x);
    return startMove(st, f, 'itemShoot');
  }
  // throw: direction from stick / smash stick
  let dir = 0; // 0 forward, 1 up, 2 down, 3 back
  if (c === C_UP || y >= 60) dir = 1;
  else if (c === C_DOWN || y <= -60) dir = 2;
  else if ((c === C_LEFT && f.facing > 0) || (c === C_RIGHT && f.facing < 0) || (Math.abs(x) >= 60 && sign(x) === -f.facing)) dir = 3;
  if (dir === 3) f.facing = -f.facing;
  f.a1 = dir === 3 ? 0 : dir;
  f.a2 = smash ? 1 : 0;
  return startMove(st, f, f.gnd < 0 ? 'itemThrowAir' : 'itemThrow');
}

/** called by the item moves' scripts */
export function releaseThrow(st: State, f: Fighter): void {
  const it = st.items.find((i) => i.id === f.item);
  if (!it) return;
  f.item = -1;
  it.st = 2;
  it.h = -1;
  it.o = f.i;
  it.t = 0;
  it.gnd = false;
  it.hitMask = 0;
  const p = f.a2 ? 1.35 : 1;
  const dir = f.a1;
  if (dir === 1) {
    it.vx = f.facing * 1;
    it.vy = -19 * p;
  } else if (dir === 2) {
    it.vx = 0;
    it.vy = f.gnd >= 0 ? -3 : 15 * p;
  } else {
    it.vx = f.facing * 15 * p;
    it.vy = -4.5;
  }
  if (ITEMS[it.k].roll && dir === 0) it.vy = 0;
  if (ITEMS[it.k].boomerang) it.vy *= 0.2;
  f.st.items++;
  ev(st, 'throwitem', it.x, it.y, f.i, it.k);
}

export function fireItem(st: State, f: Fighter): void {
  const it = st.items.find((i) => i.id === f.item);
  if (!it || it.uses <= 0) return;
  const d = ITEMS[it.k];
  it.uses--;
  const sk = fighterSkel(st, f, cfOf(f));
  const [px, py] = bonePoint(sk, 'handF', 20, 0);
  // an instant beam: hit the first bro in front within range
  const range = d.id === 'cannon' ? 190 : d.id === 'laser' ? 900 : 620;
  let best: Fighter | null = null;
  let bd = range;
  for (const t of st.fighters) {
    if (!canTouch(st, f, t)) continue;
    const dx = (t.x - px) * f.facing;
    const dy = Math.abs(t.y - bodyH(st, t) * 0.5 - py);
    if (dx > 0 && dx < bd && dy < (d.id === 'cannon' ? 120 : bodyH(st, t) * 0.55)) {
      bd = dx;
      best = t;
    }
  }
  ev(st, 'beam', px, py, f.i, bd * f.facing, it.k, d.id);
  if (best) {
    const r = applyHit(st, f, best, d.hit!, { sx: px, sy: py, facing: f.facing, dmgMult: 1, kbMult: 1, proj: true, moveIdx: -1, shielded: isShielding(best) });
    if (r === 'hit' && d.id === 'shrink') best.tinyT = 480;
  }
  if (it.uses <= 0) {
    it.dead = true;
    f.item = -1;
    ev(st, 'itemgone', px, py, f.i);
  }
}

export function tryPickup(st: State, f: Fighter): boolean {
  if (f.gnd < 0 || f.item >= 0) return false;
  const reach = bodyW(st, f) + 34;
  for (const it of st.items) {
    if (it.dead || it.st !== 0) continue;
    const d = ITEMS[it.k];
    if (d.kind === 'coin' || d.kind === 'orb') continue;
    if (Math.abs(it.x - f.x) > reach + d.r || Math.abs(it.y - f.y) > 40) continue;
    f.st.items++;
    if (d.kind === 'food') {
      f.dmg = Math.max(0, f.dmg - (d.heal ?? 10));
      f.hp = Math.min(st.cfg.hp * (st.cfg.players[f.i]?.hpMult ?? 1), f.hp + (d.heal ?? 10));
      it.dead = true;
      ev(st, 'eat', f.x, f.y, f.i, it.k);
      f.act = A.PICKUP;
      f.af = 0;
      return true;
    }
    if (d.kind === 'buff') {
      if (d.id === 'hype') f.speedT = 600;
      if (d.id === 'protein') {
        f.giantT = 600;
        f.tinyT = 0;
      }
      if (d.id === 'star') f.starT = 480;
      it.dead = true;
      ev(st, 'buff', f.x, f.y, f.i, it.k);
      f.act = A.PICKUP;
      f.af = 0;
      return true;
    }
    f.item = it.id;
    it.st = 1;
    it.h = f.i;
    f.act = A.PICKUP;
    f.af = 0;
    ev(st, 'pickup', it.x, it.y, f.i, it.k);
    return true;
  }
  return false;
}

function openBox(st: State, it: Item): void {
  it.dead = true;
  ev(st, 'boxopen', it.x, it.y, -1);
  const n = 2 + rint(st, 2);
  for (let i = 0; i < n; i++) {
    if (rint(st, 5) === 0) {
      const b = newItem(st, ITEM_INDEX.fizz, it.x, it.y - 20);
      b.st = 2;
      b.vx = (rint(st, 9) - 4) * 1.5;
      b.vy = -8;
      b.t = 0;
      continue;
    }
    let k = rint(st, ITEMS.length);
    while (ITEMS[k].w === 0 || ITEMS[k].id === 'box') k = rint(st, ITEMS.length);
    const c = newItem(st, k, it.x, it.y - 20);
    c.vx = (rint(st, 9) - 4) * 1.6;
    c.vy = -9;
  }
}

/** Guest Star capsule: a cameo hazard that helps its owner */
function guestStar(st: State, it: Item): void {
  const kinds = ['roadie', 'laughtrack', 'cameraman'];
  const k = kinds[nextU32(st) % 3];
  st.hazards.push({ k, x: it.x, y: it.y, vx: (st.fighters[it.o]?.facing ?? 1) * 9, vy: 0, t: 0, life: k === 'roadie' ? 150 : 90, r: k === 'laughtrack' ? 60 : 50, dead: false, o: it.o });
  ev(st, 'guest', it.x, it.y, it.o, 0, 0, k);
}

/** coins fly out of a bro who gets hit (coin battle); n coins, owned by the victim so they can't grab them straight back */
export function dropCoins(st: State, t: Fighter, n: number): void {
  for (let i = 0; i < n; i++) {
    const c = newItem(st, ITEM_INDEX.coin, t.x, t.y - bodyH(st, t) * 0.6);
    c.vx = (rint(st, 21) - 10) * 0.8;
    c.vy = -6 - rint(st, 6);
    c.o = t.i;
  }
}

export function hitApplied(st: State, t: Fighter, dmg: number): void {
  if (st.cfg.mode === 'coin') dropCoins(st, t, Math.max(1, Math.floor(dmg / 5)));
}

export function heldItemDef(st: State, f: Fighter): ItemDef | null {
  if (f.item < 0) return null;
  const it = st.items.find((i) => i.id === f.item);
  return it ? ITEMS[it.k] : null;
}

export { hasMove };

registerScripts({
  'item:throw': (st, f) => {
    if (f.mf === 5) releaseThrow(st, f);
  },
  'item:fire': (st, f) => {
    if (f.mf === 3) fireItem(st, f);
  },
});
