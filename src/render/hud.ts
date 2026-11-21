// The heads-up display: percent cards, stocks, ultimate meters, timer, banners, off-screen bubbles.
import { A } from '../sim/acts';
import { fighterSkel } from '../sim/anim';
import { FIGHTERS } from '../sim/data';
import { INTRO_FRAMES } from '../sim/sim';
import type { Fighter, State } from '../sim/types';
import { circle, makeCanvas, OUTLINE, rgba, rrect, screenT, shade } from './art';
import type { Camera } from './camera';
import { artFor } from './fighters';
import { drawFighter } from './fighterDraw';

export interface HudInfo {
  names: string[];
  tints: string[];
  palettes: number[];
  /** banner override text (story objectives etc.) */
  objective?: string;
  /** which slots are this machine's players (for the P1/P2 tags) */
  local: boolean[];
  hideHud?: boolean;
}

export function pctColor(d: number): string {
  if (d < 35) return '#ffffff';
  if (d < 70) return '#fff27a';
  if (d < 100) return '#ffb13a';
  if (d < 140) return '#ff5a3a';
  return '#c41a3a';
}

/** draw a fighter's head into a circle (menus and the HUD) */
export function drawPortrait(c: CanvasRenderingContext2D, st: State | null, defIdx: number, palette: number, x: number, y: number, r: number, t: number): void {
  const cf = FIGHTERS[defIdx];
  const art = artFor(cf.def.id);
  c.save();
  c.beginPath();
  c.arc(x, y, r, 0, Math.PI * 2);
  c.clip();
  const pal = art.palettes[palette % art.palettes.length];
  c.fillStyle = shade(pal.main, -0.35);
  c.fillRect(x - r, y - r, r * 2, r * 2);
  const fake = makeDummy(defIdx);
  const fst = (st ?? dummyState()) as State;
  const k = fighterSkel(fst, fake, cf);
  // position so the head is centred
  const scale = (r * 1.15) / (cf.def.rig.head * 2.2);
  c.translate(x, y + r * 0.15);
  c.scale(scale, scale);
  c.translate(-k.head[0], -k.head[1]);
  drawFighter(c, fst, fake, { palette, tint: '#fff', still: true, skel: k }, t);
  c.restore();
}

const portraitCache = new Map<string, HTMLCanvasElement>();
/**
 * The HUD's portraits, painted once per fighter, colour and size and then copied (D22): drawing a whole fighter
 * into every card and off-screen bubble each frame was most of the HUD's cost.
 */
export function drawPortraitCached(c: CanvasRenderingContext2D, defIdx: number, palette: number, x: number, y: number, r: number): void {
  const m = c.getTransform();
  const s = Math.hypot(m.a, m.b);
  const R = Math.max(4, Math.round(r * s));
  const key = `${defIdx}|${palette}|${R}`;
  let cv = portraitCache.get(key);
  if (!cv) {
    if (portraitCache.size > 64) portraitCache.clear();
    cv = makeCanvas(R * 2, R * 2);
    drawPortrait(cv.getContext('2d')!, null, defIdx, palette, R, R, R, 0);
    portraitCache.set(key, cv);
  }
  c.drawImage(cv, x - r, y - r, r * 2, r * 2);
}

let dummyCache: State | null = null;
function dummyState(): State {
  if (!dummyCache) {
    dummyCache = {
      frame: 0,
      cfg: { players: [], mods: [], mode: 'stock' },
      modBits: 0,
      audience: { t: 0, mod: '', left: 0 },
      paint: [],
      fighters: [],
      ev: [],
    } as unknown as State;
  }
  return dummyCache;
}

function makeDummy(def: number): Fighter {
  return {
    i: 0,
    def,
    act: A.IDLE,
    af: 0,
    x: 0,
    y: 0,
    facing: 1,
    grav: 1,
    gnd: 0,
    hitlag: 0,
    hurtFx: 0,
    invinc: 0,
    starT: 0,
    frozenT: 0,
    giantT: 0,
    tinyT: 0,
    v: [0, 0, 0, 0, 0, 0, 0, 0],
    lSpd: 0,
  } as unknown as Fighter;
}

export function drawHud(c: CanvasRenderingContext2D, st: State, w: number, h: number, info: HudInfo, t: number, shakeP: number[]): void {
  screenT(c);
  if (info.hideHud) return;
  const players = st.fighters.filter((f) => !st.cfg.players[f.i]?.grunt && !st.cfg.players[f.i]?.boss);
  const n = players.length;
  const cardW = Math.min(250, (w - 40) / Math.max(1, n) - 14);
  const cardH = Math.max(70, Math.min(96, h * 0.12));
  const total = n * cardW + (n - 1) * 14;
  let x = (w - total) / 2;
  const y = h - cardH - 14;
  for (const f of players) {
    drawCard(c, st, f, x, y, cardW, cardH, info, t, shakeP[f.i] ?? 0);
    x += cardW + 14;
  }
  // timer
  const cfg = st.cfg;
  if (cfg.time > 0 && !cfg.goal) {
    const left = Math.max(0, cfg.time * 60 - st.timer);
    const s = Math.ceil(left / 60);
    const txt = `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
    bigText(c, txt, w - 90, 46, 40, s <= 10 ? '#ff5a3a' : '#ffffff');
  }
  if (cfg.goal?.kind === 'survive') {
    const left = Math.max(0, (cfg.goal.frames ?? 0) - st.timer);
    bigText(c, `SURVIVE ${Math.ceil(left / 60)}`, w / 2, 46, 34, '#ffe14f');
  }
  if (cfg.goal?.kind === 'ko') bigText(c, `KO ${st.goalCount} / ${cfg.goal.count}`, w / 2, 46, 34, '#ffe14f');
  if (st.boss && !st.boss.dead) {
    const bw = Math.min(600, w * 0.6);
    const bx = (w - bw) / 2;
    rrect(c, bx - 4, 20, bw + 8, 26, 10);
    c.fillStyle = OUTLINE;
    c.fill();
    const frac = st.boss.hp / st.boss.maxHp;
    const g = c.createLinearGradient(bx, 0, bx + bw, 0);
    g.addColorStop(0, '#ff3a6e');
    g.addColorStop(1, '#ffe14f');
    c.fillStyle = g;
    rrect(c, bx, 24, bw * frac, 18, 8);
    c.fill();
    bigText(c, 'THE BIG BRO-ADCAST', w / 2, 66, 20, '#ffffff');
  }
  if (info.objective && st.timer < 240) bigText(c, info.objective, w / 2, h * 0.2, 30, '#ffe14f');
  // mode banners
  if (st.audience.left > 560) bigText(c, `THE AUDIENCE CHOSE: ${modLabel(st.audience.mod).toUpperCase()}!`, w / 2, h * 0.18, 30, '#ff7af2');
}

const MOD_LABELS: Record<string, string> = {
  lowgrav: 'Low gravity',
  heavygrav: 'Heavy gravity',
  giant: 'Giants',
  tiny: 'Tiny bros',
  turbo: 'Turbo',
  ice: 'Ice floors',
  wind: 'Wind',
  meteors: 'Meteor shower',
  topsy: 'Topsy-turvy',
  itemrain: 'Item rain',
  glass: 'Glass cannons',
  suddenult: 'Ultimates for everyone',
};
export function modLabel(id: string): string {
  return MOD_LABELS[id] ?? id;
}

function drawCard(c: CanvasRenderingContext2D, st: State, f: Fighter, x: number, y: number, w: number, h: number, info: HudInfo, t: number, shk: number): void {
  const tint = info.tints[f.i] ?? '#fff';
  const out = f.out;
  c.save();
  c.globalAlpha = out ? 0.45 : 1;
  rrect(c, x, y, w, h, 16);
  const g = c.createLinearGradient(x, y, x, y + h);
  g.addColorStop(0, rgba(tint, 0.95));
  g.addColorStop(1, shade(tint, -0.45));
  c.fillStyle = g;
  c.fill();
  c.lineWidth = 4;
  c.strokeStyle = OUTLINE;
  c.stroke();
  const r = h * 0.38;
  drawPortraitCached(c, f.def, info.palettes[f.i] ?? 0, x + r + 10, y + h * 0.46, r);
  c.lineWidth = 3;
  c.strokeStyle = OUTLINE;
  c.beginPath();
  c.arc(x + r + 10, y + h * 0.46, r, 0, Math.PI * 2);
  c.stroke();
  // name
  const name = info.names[f.i] ?? FIGHTERS[f.def].def.name;
  c.font = `800 ${Math.round(h * 0.16)}px Nunito, sans-serif`;
  c.textAlign = 'left';
  c.textBaseline = 'alphabetic';
  c.fillStyle = '#fff';
  c.fillText(name.slice(0, 16), x + r * 2 + 20, y + h * 0.27);
  // percent / hp
  const cfg = st.cfg;
  const big = Math.round(h * 0.5);
  const sx = shk > 0 ? (Math.random() - 0.5) * shk : 0;
  const sy = shk > 0 ? (Math.random() - 0.5) * shk : 0;
  if (cfg.mode === 'stamina') {
    const hp = Math.max(0, Math.ceil(f.hp));
    bigText(c, `${hp}`, x + w - 60 + sx, y + h * 0.62 + sy, big, hp < 40 ? '#ff5a3a' : '#ffffff', 'right');
    c.font = `900 ${Math.round(h * 0.2)}px Bungee, Impact`;
    c.fillStyle = '#fff';
    c.fillText('HP', x + w - 54, y + h * 0.62);
  } else {
    const d = Math.floor(f.dmg);
    const frac = Math.floor((f.dmg - d) * 10);
    bigText(c, `${d}`, x + w - 46 + sx, y + h * 0.64 + sy, big, pctColor(f.dmg), 'right');
    c.font = `900 ${Math.round(h * 0.22)}px Bungee, Impact`;
    c.fillStyle = pctColor(f.dmg);
    c.strokeStyle = OUTLINE;
    c.lineWidth = 4;
    c.strokeText(`.${frac}%`, x + w - 44, y + h * 0.64);
    c.fillText(`.${frac}%`, x + w - 44, y + h * 0.64);
  }
  // stocks / score / coins
  const ix = x + r * 2 + 22;
  const iy = y + h * 0.84;
  if (cfg.mode === 'stock' || cfg.mode === 'stamina') {
    const s = Math.max(0, f.stocks);
    for (let i = 0; i < Math.min(s, 8); i++) circle(c, ix + i * 15, iy, 6, shade(tint, 0.35), OUTLINE, 2.5);
    if (s > 8) {
      c.fillStyle = '#fff';
      c.font = '800 13px Nunito';
      c.fillText(`×${s}`, ix + 8 * 15, iy + 5);
    }
  } else {
    c.font = `900 ${Math.round(h * 0.17)}px Bungee, Impact`;
    c.fillStyle = '#fff';
    const v = cfg.mode === 'coin' ? `● ${f.coins}` : cfg.mode === 'koth' ? `${Math.floor(f.score / 60)}s` : `${f.score > 0 ? '+' : ''}${f.score}`;
    c.fillText(v, ix, iy + 6);
  }
  // ultimate meter
  if (cfg.ult === 'meter' || f.ultReady) {
    const mw = w - r * 2 - 34;
    const mx = x + r * 2 + 22;
    const my = y + h * 0.36;
    rrect(c, mx, my, mw, 7, 3);
    c.fillStyle = 'rgba(0,0,0,0.45)';
    c.fill();
    rrect(c, mx, my, (mw * (f.ultReady ? 100 : f.meter)) / 100, 7, 3);
    c.fillStyle = f.ultReady ? `hsl(${(t * 8) % 360},100%,65%)` : '#ffe14f';
    c.fill();
  }
  if (st.bounty === f.i) {
    c.fillStyle = '#ffe14f';
    c.font = '900 16px Bungee, Impact';
    c.fillText('★ BOUNTY', x + 10, y - 6);
  }
  if (st.bomb.holder === f.i) {
    c.fillStyle = '#ff7a2a';
    c.font = '900 16px Bungee, Impact';
    c.fillText(`💣 ${Math.ceil(st.bomb.t / 60)}`, x + w - 60, y - 6);
  }
  c.restore();
}

export function bigText(c: CanvasRenderingContext2D, s: string, x: number, y: number, size: number, col: string, align: CanvasTextAlign = 'center'): void {
  c.save();
  c.font = `900 ${size}px Bungee, Impact, sans-serif`;
  c.textAlign = align;
  c.textBaseline = 'middle';
  c.lineJoin = 'round';
  c.lineWidth = Math.max(4, size * 0.18);
  c.strokeStyle = OUTLINE;
  c.strokeText(s, x, y);
  c.fillStyle = col;
  c.fillText(s, x, y);
  c.restore();
}

/** countdown, GO, GAME, ultimate banners */
export function drawBanners(c: CanvasRenderingContext2D, st: State, w: number, h: number, t: number, ultName: (f: Fighter) => string): void {
  screenT(c);
  if (st.intro > 0) {
    const n = Math.ceil(st.intro / 60);
    const f = (st.intro % 60) / 60;
    if (st.intro < INTRO_FRAMES - 30 || n < 3) {
      const s = 1 + f * 0.6;
      bigText(c, `${Math.min(3, n)}`, w / 2, h * 0.42, Math.round(140 * s), ['#ff3a6e', '#ffe14f', '#3affd5'][Math.min(2, 3 - n)]);
    } else bigText(c, 'READY?', w / 2, h * 0.42, 90, '#ffffff');
  } else if (st.timer < 50 && !st.over && st.frame > 10) {
    const s = 1 + Math.max(0, (30 - st.timer) / 30) * 0.5;
    c.globalAlpha = Math.min(1, (50 - st.timer) / 15);
    bigText(c, 'GO!', w / 2, h * 0.42, Math.round(160 * s), '#ffe14f');
    c.globalAlpha = 1;
  }
  if (st.over && st.overFrame < 200) {
    const s = 1 + Math.max(0, (20 - st.overFrame) / 20) * 0.8;
    bigText(c, st.cfg.goal && st.winner.length === 0 ? 'FAILED!' : 'GAME!', w / 2, h * 0.42, Math.round(170 * s), '#ffffff');
  }
  if (st.freeze > 0 && st.freezeBy >= 0) {
    const f = st.fighters[st.freezeBy];
    const a = Math.min(1, (50 - st.freeze) / 8);
    c.save();
    c.globalAlpha = 0.55 * a;
    c.fillStyle = '#000';
    c.fillRect(0, 0, w, h);
    c.globalAlpha = a;
    const yy = h * 0.5;
    c.fillStyle = '#ffe14f';
    c.beginPath();
    c.moveTo(0, yy - 70);
    c.lineTo(w, yy - 110);
    c.lineTo(w, yy + 40);
    c.lineTo(0, yy + 80);
    c.fill();
    bigText(c, 'ULTIMATE!', w * 0.5 + (st.freeze - 25) * 6, yy - 22, 74, '#ff3a6e');
    bigText(c, ultName(f), w * 0.5 - (st.freeze - 25) * 4, yy + 40, 34, '#ffffff');
    c.restore();
  }
  void t;
}

/** little bubbles at the screen edge for fighters out of view */
export function drawOffscreen(c: CanvasRenderingContext2D, st: State, cam: Camera, w: number, h: number, tints: string[], palettes: number[], t: number): void {
  screenT(c);
  for (const f of st.fighters) {
    if (f.out || f.act === A.DEAD) continue;
    const [sx, sy] = cam.worldToScreen(f.x, f.y - 60, w, h);
    const m = 50;
    if (sx > -10 && sx < w + 10 && sy > -10 && sy < h + 10) continue;
    const bx = Math.max(m, Math.min(w - m, sx));
    const by = Math.max(m, Math.min(h - m - 120, sy));
    const r = 34;
    circle(c, bx, by, r + 5, tints[f.i] ?? '#fff', OUTLINE, 4);
    drawPortraitCached(c, f.def, palettes[f.i] ?? 0, bx, by, r);
    // arrow toward the fighter
    const ang = Math.atan2(sy - by, sx - bx);
    c.fillStyle = tints[f.i] ?? '#fff';
    c.beginPath();
    c.moveTo(bx + Math.cos(ang) * (r + 22), by + Math.sin(ang) * (r + 22));
    c.lineTo(bx + Math.cos(ang + 0.4) * (r + 6), by + Math.sin(ang + 0.4) * (r + 6));
    c.lineTo(bx + Math.cos(ang - 0.4) * (r + 6), by + Math.sin(ang - 0.4) * (r + 6));
    c.fill();
    const d = Math.floor(f.dmg);
    bigText(c, `${d}%`, bx, by + r + 16, 18, pctColor(f.dmg));
  }
}
