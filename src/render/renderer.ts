// Draws a whole frame: background, stage, paint, items, projectiles, fighters, shields, effects, HUD, banners.
import { A } from '../sim/acts';
import { allSkels, hitCircle, hurtCapsules, isShielding, shieldCircle } from '../sim/combat';
import { FIGHTERS } from '../sim/data';
import { mod } from '../sim/mods';
import type { Fighter, State } from '../sim/types';
import { bigText, drawBanners, drawHud, drawOffscreen, type HudInfo } from './hud';
import { circle, OUTLINE, rgba } from './art';
import { Camera } from './camera';
import { Effects } from './effects';
import { drawFighter, drawShield } from './fighterDraw';
import { drawBackground, drawForeground, drawStage } from './stages';
import { drawBoss, drawHazards, drawHill, drawItem, drawLava, drawPaint, drawProj } from './things';

export const PLAYER_TINTS = ['#ff3a4e', '#3a8dff', '#ffcf3a', '#3ad27a', '#ff8a2a', '#b26bff', '#3affd5', '#ff6fb5'];
export const TEAM_TINTS = ['#ff3a4e', '#3a8dff', '#3ad27a', '#ffcf3a'];

export interface ViewOpts extends HudInfo {
  boxes?: boolean;
  topsy?: boolean;
}

export class Renderer {
  c: CanvasRenderingContext2D;
  cam = new Camera();
  fx = new Effects();
  t = 0;
  w = 1;
  h = 1;
  dpr = 1;
  private lastDmg: number[] = [];
  private shakeP: number[] = [];
  /** fighters' previous positions for smoothing at high refresh rates */
  constructor(public canvas: HTMLCanvasElement) {
    this.c = canvas.getContext('2d', { alpha: false })!;
    this.resize();
  }

  resize(): void {
    this.dpr = Math.min(2, window.devicePixelRatio || 1);
    const w = Math.max(1, Math.floor(this.canvas.clientWidth * this.dpr));
    const h = Math.max(1, Math.floor(this.canvas.clientHeight * this.dpr));
    if (w !== this.canvas.width || h !== this.canvas.height) {
      this.canvas.width = w;
      this.canvas.height = h;
    }
    this.w = w;
    this.h = h;
  }

  /** process new simulation events (call once per simulated frame) */
  ingest(st: State, tints: string[]): void {
    this.fx.events(st, this.cam, tints);
  }

  draw(st: State, o: ViewOpts, dt: number): void {
    this.resize();
    this.t++;
    const c = this.c;
    const { w, h } = this;
    const tints = o.tints;
    this.cam.update(st, w, h, dt);
    // topsy-turvy: the camera rolls over for a while
    const topsyOn = mod(st, 'topsy') && st.timer % 1800 > 1200;
    const targetRot = topsyOn ? Math.PI : 0;
    this.cam.rot += (targetRot - this.cam.rot) * 0.06;
    if (Math.abs(this.cam.rot - targetRot) < 0.001) this.cam.rot = targetRot;
    const blackout = mod(st, 'blackout') && st.timer % 1500 > 900;
    this.fx.update();
    this.fx.trails(st);
    // percent shake when damage goes up
    st.fighters.forEach((f, i) => {
      if (this.lastDmg[i] !== undefined && f.dmg > this.lastDmg[i] + 0.5) this.shakeP[i] = Math.min(16, 4 + (f.dmg - this.lastDmg[i]) * 0.8);
      this.lastDmg[i] = f.dmg;
      this.shakeP[i] = Math.max(0, (this.shakeP[i] ?? 0) - 0.7);
    });

    drawBackground(c, st, this.cam, w, h, this.t, blackout);
    this.cam.apply(c, w, h);
    drawLava(c, st, this.t);
    drawBoss(c, st, this.t);
    drawStage(c, st, this.t, blackout);
    drawPaint(c, st, tints);
    drawHill(c, st, this.t, tints);
    for (const it of st.items) if (it.st !== 1) drawItem(c, it, this.t);
    const skels = allSkels(st);
    // fighters, back to front by index
    const invisible = mod(st, 'invisible');
    const order = st.fighters.slice().sort((a, b) => (a.act === A.GRABBED ? -1 : 0) - (b.act === A.GRABBED ? -1 : 0));
    for (const f of order) {
      if (f.out || f.act === A.DEAD) continue;
      if (st.cfg.players[f.i]?.boss) continue;
      let alpha = 1;
      if (invisible && f.lastHitT > 60 && f.act !== A.SHIELD && f.act !== A.RESPAWN) alpha = 0.06 + (f.act === A.MOVE ? 0.12 : 0);
      if (blackout) alpha *= 0.85;
      this.drawRespawnPlatform(c, f);
      // shadow on the ground
      drawFighter(c, st, f, { palette: o.palettes[f.i] ?? 0, tint: tints[f.i], alpha, skel: skels[f.i] }, this.t);
      // held item
      if (f.item >= 0) {
        const it = st.items.find((i) => i.id === f.item);
        if (it) drawItem(c, it, this.t);
      }
      if (isShielding(f)) {
        const [sx, sy, sr] = shieldCircle(st, f, FIGHTERS[f.def]);
        drawShield(c, sx, sy, sr, hexToRgb(tints[f.i] ?? '#9cf'), this.t);
      }
      if (f.ultReady && this.t % 6 < 3) {
        c.strokeStyle = `hsla(${(this.t * 12) % 360},100%,65%,0.8)`;
        c.lineWidth = 6;
        c.beginPath();
        c.arc(f.x, f.y - 60 * skels[f.i].scale, 80 * skels[f.i].scale, 0, Math.PI * 2);
        c.stroke();
      }
      this.tag(c, st, f, o, skels[f.i].scale);
    }
    for (const p of st.projs) drawProj(c, p, this.t, tints);
    drawHazards(c, st, this.t, tints);
    this.fx.draw(c);
    if (o.boxes) this.drawBoxes(c, st);
    if (blackout) this.darkness(c, st);
    // screen space
    c.setTransform(1, 0, 0, 1, 0, 0);
    drawForeground(c, st, w, h, this.t, this.fx.cheer);
    if (this.fx.flash > 0) {
      c.fillStyle = rgba(this.fx.flashCol.startsWith('#') ? this.fx.flashCol : '#ffffff', this.fx.flash * 0.6);
      c.fillRect(0, 0, w, h);
    }
    drawOffscreen(c, st, this.cam, w, h, tints, o.palettes, this.t);
    drawHud(c, st, w, h, o, this.t, this.shakeP);
    if (!o.hideHud || st.freeze > 0) drawBanners(c, st, w, h, this.t, (f) => {
      const d = FIGHTERS[f.def].def;
      return `${d.name}: ${d.moveNames.ult ?? 'Ultimate'}`;
    });
    this.fx.drawScreen(c, w, h);
    if (st.cfg.mods.includes('swap') && st.swapT > 1620) bigText(c, `SWAP IN ${Math.ceil((1800 - st.swapT) / 60)}`, w / 2, h * 0.12, 36, '#3affd5');
  }

  private tag(c: CanvasRenderingContext2D, st: State, f: Fighter, o: ViewOpts, s: number): void {
    const col = o.tints[f.i] ?? '#fff';
    const pc = st.cfg.players[f.i];
    if (pc?.grunt) return;
    const label = pc?.cpu ? 'CPU' : `P${f.i + 1}`;
    const top = f.grav > 0 ? f.y - FIGHTERS[f.def].height * s - 26 : f.y + FIGHTERS[f.def].height * s + 26;
    c.save();
    c.font = '900 22px Bungee, Impact';
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    c.lineWidth = 5;
    c.strokeStyle = OUTLINE;
    c.strokeText(label, f.x, top - 10);
    c.fillStyle = col;
    c.fillText(label, f.x, top - 10);
    c.beginPath();
    c.moveTo(f.x - 8, top + 4);
    c.lineTo(f.x + 8, top + 4);
    c.lineTo(f.x, top + 14);
    c.closePath();
    c.fill();
    c.restore();
  }

  private drawRespawnPlatform(c: CanvasRenderingContext2D, f: Fighter): void {
    if (f.act !== A.RESPAWN) return;
    c.fillStyle = 'rgba(255,255,255,0.85)';
    c.beginPath();
    c.ellipse(f.x, f.y + 4, 70, 14, 0, 0, Math.PI * 2);
    c.fill();
    c.strokeStyle = OUTLINE;
    c.lineWidth = 4;
    c.stroke();
  }

  private darkness(c: CanvasRenderingContext2D, st: State): void {
    // a spotlight on every fighter
    const v = this.cam.viewRect(this.w, this.h);
    c.save();
    c.fillStyle = 'rgba(4,2,10,0.82)';
    c.beginPath();
    c.rect(v.l - 200, v.t - 200, v.r - v.l + 400, v.b - v.t + 400);
    for (const f of st.fighters) {
      if (f.out || f.act === A.DEAD) continue;
      c.moveTo(f.x + 150, f.y - 60);
      c.arc(f.x, f.y - 60, 150, 0, Math.PI * 2, true);
    }
    c.fill('evenodd');
    c.restore();
  }

  private drawBoxes(c: CanvasRenderingContext2D, st: State): void {
    const skels = allSkels(st);
    for (const f of st.fighters) {
      if (f.out || f.act === A.DEAD) continue;
      const cf = FIGHTERS[f.def];
      for (const cap of hurtCapsules(skels[f.i], cf)) {
        c.strokeStyle = f.intang > 0 || f.invinc > 0 ? 'rgba(80,160,255,0.8)' : 'rgba(255,230,60,0.7)';
        c.lineWidth = cap[4] * 2;
        c.lineCap = 'round';
        c.globalAlpha = 0.35;
        c.beginPath();
        c.moveTo(cap[0], cap[1]);
        c.lineTo(cap[2], cap[3]);
        c.stroke();
        c.globalAlpha = 1;
      }
      if (f.act === A.MOVE) {
        const m = cf.moves[f.mv];
        for (const hb of m.hits ?? []) {
          if (f.mf < hb.f[0] || f.mf > hb.f[1]) continue;
          const [x, y, r] = hitCircle(skels[f.i], hb);
          circle(c, x, y, r, hb.grab ? 'rgba(160,80,255,0.45)' : 'rgba(255,40,40,0.45)', '#ff2020', 2);
        }
      }
      c.fillStyle = '#fff';
      c.fillRect(f.x - 3, f.y - 3, 6, 6);
    }
  }
}

export function hexToRgb(hex: string): string {
  const n = parseInt(hex.slice(1), 16);
  return `rgb(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255})`;
}
