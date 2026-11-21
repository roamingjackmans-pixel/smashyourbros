// Particles and pop-ups driven by simulation events (de-duplicated, since rollback replays frames).
import { A } from '../sim/acts';
import { FIGHTERS, STAGES } from '../sim/data';
import type { Ev, State } from '../sim/types';
import { circle, makeCanvas, OUTLINE, rgba } from './art';
import type { Camera } from './camera';

/** what a bro says after sending their bro into orbit */
export const KO_QUIPS = [
  'Sorry bro! Love you!',
  'Call me when you land, bro!',
  'That was a love tap, I swear!',
  'Bro… you looked so good flying.',
  'Same time next week? 💪',
  'Hydrate up there, king!',
  'I’d say sorry but you’re too cute to apologise to.',
  'Respectfully: GET SMASHED, BRO.',
  'Miss you already!',
  'That one was for the group chat.',
];

export const FX_COL: Record<string, string> = {
  hit: '#fff27a',
  slash: '#bff4ff',
  fire: '#ff7a2a',
  elec: '#7af0ff',
  ice: '#bfe9ff',
  water: '#5ab8ff',
  dark: '#b26bff',
  paint: '#ff4fd2',
  sound: '#ffe14f',
  magic: '#ff7af2',
  rock: '#d6b48a',
  wind: '#e6fff6',
  note: '#ffd23a',
  time: '#9cffd9',
  grav: '#9b7bff',
  food: '#ffb3a6',
};

interface P {
  k: 'spark' | 'ring' | 'dust' | 'smoke' | 'text' | 'blast' | 'boom' | 'confetti' | 'shard' | 'note' | 'star' | 'splat' | 'bubble';
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  max: number;
  size: number;
  col: string;
  rot: number;
  text?: string;
  /** screen-space particles ignore the camera */
  screen?: boolean;
  /** a speech bubble's wrapped lines and width, measured once */
  lines?: string[];
  bw?: number;
}

// the KO beam and explosions used fresh gradients every frame; they are sprites now, faded with globalAlpha (D22)
const sprites = new Map<string, HTMLCanvasElement>();
function fxSprite(key: string, w: number, h: number, paint: (g: CanvasRenderingContext2D) => void): HTMLCanvasElement {
  let cv = sprites.get(key);
  if (!cv) {
    if (sprites.size > 40) sprites.clear();
    cv = makeCanvas(w, h);
    paint(cv.getContext('2d')!);
    sprites.set(key, cv);
  }
  return cv;
}
function blastSprite(col: string): HTMLCanvasElement {
  return fxSprite(`blast${col}`, 512, 64, (g) => {
    const lg = g.createLinearGradient(0, 0, 512, 0);
    lg.addColorStop(0, rgbaAny(col, 0.95));
    lg.addColorStop(0.6, rgbaAny(col, 0.35));
    lg.addColorStop(1, rgbaAny(col, 0));
    g.fillStyle = lg;
    g.fillRect(0, 0, 512, 64);
  });
}
function boomSprite(): HTMLCanvasElement {
  return fxSprite('boom', 256, 256, (g) => {
    const rg = g.createRadialGradient(128, 128, 0, 128, 128, 128);
    rg.addColorStop(0, 'rgba(255,255,220,1)');
    rg.addColorStop(0.4, 'rgba(255,170,60,0.9)');
    rg.addColorStop(1, 'rgba(255,60,40,0)');
    g.fillStyle = rg;
    g.fillRect(0, 0, 256, 256);
  });
}

export class Effects {
  ps: P[] = [];
  seen = new Map<string, number>();
  flash = 0;
  flashCol = '#fff';
  cheer = 0;
  /** callbacks for sounds etc. */
  onEvent: ((e: Ev, st: State) => void) | null = null;

  add(p: Partial<P> & Pick<P, 'k' | 'x' | 'y'>): void {
    this.ps.push({ vx: 0, vy: 0, life: 20, max: 20, size: 10, col: '#fff', rot: 0, ...p } as P);
    if (this.ps.length > 900) this.ps.splice(0, this.ps.length - 900);
  }

  spark(x: number, y: number, col: string, size: number, n = 8): void {
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2 + Math.random() * 0.4;
      const sp = size * (0.25 + Math.random() * 0.35);
      this.add({ k: 'spark', x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, life: 10 + Math.random() * 6, max: 16, size: size * 0.5, col, rot: a });
    }
    this.add({ k: 'star', x, y, life: 8, max: 8, size: size * 1.4, col, rot: Math.random() * 6 });
    this.add({ k: 'ring', x, y, life: 12, max: 12, size: size * 0.6, col });
  }

  dust(x: number, y: number, n = 4, dir = 0): void {
    for (let i = 0; i < n; i++) this.add({ k: 'dust', x: x + (Math.random() - 0.5) * 30, y: y - 6, vx: dir * 2 + (Math.random() - 0.5) * 4, vy: -Math.random() * 2.5, life: 22 + Math.random() * 10, max: 32, size: 10 + Math.random() * 10, col: 'rgba(240,235,255,0.9)' });
  }

  text(x: number, y: number, s: string, col: string, size = 34): void {
    this.add({ k: 'text', x, y, vy: -2.2, life: 46, max: 46, size, col, text: s });
  }

  /** process this frame's events once */
  events(st: State, cam: Camera, tints: string[]): void {
    for (const [k, f] of this.seen) if (f < st.frame - 40) this.seen.delete(k);
    for (const e of st.ev) {
      const key = `${st.frame}:${e.t}:${e.p}:${Math.round(e.x)}:${Math.round(e.y)}:${e.a ?? ''}`;
      if (this.seen.has(key)) continue;
      this.seen.set(key, st.frame);
      this.onEvent?.(e, st);
      this.one(e, st, cam, tints);
    }
  }

  private one(e: Ev, st: State, cam: Camera, tints: string[]): void {
    switch (e.t) {
      case 'hit': {
        const dmg = e.a ?? 5;
        const kb = e.b ?? 40;
        const col = FX_COL[e.s ?? 'hit'] ?? '#fff';
        this.spark(e.x, e.y, col, 20 + dmg * 2.6, kb > 90 ? 12 : 8);
        if (e.s === 'elec') for (let i = 0; i < 4; i++) this.add({ k: 'spark', x: e.x, y: e.y, vx: (Math.random() - 0.5) * 22, vy: (Math.random() - 0.5) * 22, life: 8, max: 8, size: 14, col: '#ffffff' });
        if (e.s === 'note') this.add({ k: 'note', x: e.x, y: e.y - 20, vy: -3, life: 40, max: 40, size: 28, col });
        if (e.s === 'paint') this.add({ k: 'splat', x: e.x, y: e.y, life: 30, max: 30, size: 30 + dmg * 2, col: tints[e.p] ?? col });
        if (kb > 70) cam.addShake(Math.min(22, (kb - 60) * 0.18));
        if (kb > 120) {
          this.flash = 0.25;
          this.flashCol = '#ffffff';
        }
        break;
      }
      case 'shield':
        this.add({ k: 'ring', x: e.x, y: e.y, life: 10, max: 10, size: 30, col: '#bfe9ff' });
        break;
      case 'parry':
        this.add({ k: 'ring', x: e.x, y: e.y, life: 18, max: 18, size: 70, col: '#ffffff' });
        this.text(e.x, e.y - 60, 'PARRY!', '#9cf6ff', 40);
        this.flash = 0.18;
        this.flashCol = '#bff4ff';
        break;
      case 'counter':
        this.text(e.x, e.y - 50, 'COUNTER!', '#ffe14f', 38);
        this.add({ k: 'ring', x: e.x, y: e.y, life: 16, max: 16, size: 80, col: '#ffe14f' });
        break;
      case 'armor':
        this.add({ k: 'ring', x: e.x, y: e.y, life: 10, max: 10, size: 50, col: '#ffb14a' });
        break;
      case 'break':
        for (let i = 0; i < 14; i++) this.add({ k: 'shard', x: e.x, y: e.y - 50, vx: (Math.random() - 0.5) * 16, vy: -Math.random() * 12, life: 40, max: 40, size: 12, col: tints[e.p] ?? '#9cf', rot: Math.random() * 6 });
        this.text(e.x, e.y - 120, 'SHIELD BREAK!', '#ff7a7a', 36);
        cam.addShake(12);
        break;
      case 'tech':
        this.add({ k: 'ring', x: e.x, y: e.y - 20, life: 14, max: 14, size: 40, col: '#ffffff' });
        this.text(e.x, e.y - 90, 'TECH!', '#ffffff', 26);
        break;
      case 'jump':
        this.dust(e.x, e.y, e.a ? 4 : 2);
        break;
      case 'djump':
        this.add({ k: 'ring', x: e.x, y: e.y, life: 12, max: 12, size: 26, col: 'rgba(255,255,255,0.8)' });
        break;
      case 'land':
        if ((e.a ?? 0) > 6) this.dust(e.x, e.y, 5);
        break;
      case 'dash':
        this.dust(e.x, e.y, 3, -1);
        break;
      case 'skid':
        this.dust(e.x, e.y, 3);
        break;
      case 'knockdown':
        this.dust(e.x, e.y, 6);
        cam.addShake(4);
        break;
      case 'bounce':
        this.add({ k: 'ring', x: e.x, y: e.y, life: 12, max: 12, size: 40, col: '#ffd0a0' });
        cam.addShake(6);
        break;
      case 'ko': {
        this.ko(st, e, cam, tints);
        break;
      }
      case 'boom':
        this.add({ k: 'boom', x: e.x, y: e.y, life: 26, max: 26, size: Math.min(460, e.a ?? 100), col: '#ffb13a' });
        for (let i = 0; i < 10; i++) this.add({ k: 'smoke', x: e.x, y: e.y, vx: (Math.random() - 0.5) * 10, vy: (Math.random() - 0.5) * 10, life: 40, max: 40, size: 30, col: 'rgba(80,60,70,0.6)' });
        cam.addShake(Math.min(20, (e.a ?? 100) / 10));
        break;
      case 'ult':
        this.flash = 0.6;
        this.flashCol = tints[e.p] ?? '#fff';
        cam.addShake(10);
        break;
      case 'ultready':
        this.text(e.x, e.y - 160, 'ULTIMATE READY!', '#ffe14f', 30);
        break;
      case 'orbbreak':
        for (let i = 0; i < 24; i++) this.add({ k: 'confetti', x: e.x, y: e.y, vx: (Math.random() - 0.5) * 18, vy: (Math.random() - 0.7) * 16, life: 60, max: 60, size: 9, col: ['#ff3a6e', '#ffe14f', '#3affd5', '#b26bff'][i % 4], rot: Math.random() * 6 });
        break;
      case 'taunt': {
        const f = st.fighters[e.p];
        const d = f ? FIGHTERS[f.def].def : null;
        if (d) this.bubble(e.x, e.y - FIGHTERS[f.def].height - 40, d.line, tints[e.p] ?? '#fff');
        break;
      }
      case 'say':
        this.text(e.x, e.y, e.s ?? '', tints[e.p] ?? '#ffe14f', 30);
        break;
      case 'eat':
        this.text(e.x, e.y - 140, 'NOM!', '#ffb3a6', 28);
        break;
      case 'buff':
        this.add({ k: 'ring', x: e.x, y: e.y - 60, life: 20, max: 20, size: 90, col: '#ffe14f' });
        break;
      case 'trump':
        this.text(e.x, e.y - 60, 'TRUMPED!', '#ffffff', 24);
        break;
      case 'splat':
        this.add({ k: 'splat', x: e.x, y: e.y, life: 24, max: 24, size: 40, col: tints[e.p] ?? '#ff4fd2' });
        break;
      case 'clank':
        this.spark(e.x, e.y, '#ffffff', 22, 6);
        break;
      case 'reflect':
        this.add({ k: 'ring', x: e.x, y: e.y, life: 14, max: 14, size: 50, col: '#9cf6ff' });
        break;
      case 'pulse':
        this.add({ k: 'ring', x: e.x, y: e.y, life: 16, max: 16, size: Math.min(260, e.a ?? 100), col: tints[e.p] ?? '#ffe14f' });
        break;
      case 'charged':
        this.add({ k: 'ring', x: e.x, y: e.y - 60, life: 14, max: 14, size: 60, col: '#ffffff' });
        break;
      case 'charge':
        this.add({ k: 'star', x: e.x + (Math.random() - 0.5) * 40, y: e.y + (Math.random() - 0.5) * 40, life: 10, max: 10, size: 16, col: '#fff6a0', rot: Math.random() });
        break;
      case 'respawn':
        this.add({ k: 'ring', x: e.x, y: e.y, life: 30, max: 30, size: 120, col: tints[e.p] ?? '#fff' });
        break;
      case 'game':
        for (let i = 0; i < 90; i++) this.add({ k: 'confetti', x: Math.random(), y: -0.05, vx: (Math.random() - 0.5) * 0.004, vy: 0.004 + Math.random() * 0.006, life: 200, max: 200, size: 10, col: ['#ff3a6e', '#ffe14f', '#3affd5', '#b26bff', '#ffffff'][i % 5], rot: Math.random() * 6, screen: true });
        break;
      case 'gflip':
        this.add({ k: 'ring', x: e.x, y: e.y, life: 18, max: 18, size: 70, col: '#9b7bff' });
        break;
      case 'stuck':
        this.text(e.x, e.y - 100, 'STUCK!', '#ffe14f', 24);
        break;
      case 'flash':
        this.flash = 0.7;
        this.flashCol = '#ffffff';
        break;
      case 'bombpass':
        this.text(e.x, e.y - 140, 'TAG!', '#ff7a2a', 30);
        break;
      case 'bounty':
        this.text(e.x, e.y - 160, 'BOUNTY CLAIMED!', '#ffe14f', 30);
        break;
      case 'onbeat':
        this.add({ k: 'note', x: e.x, y: e.y - 40, vy: -3, life: 36, max: 36, size: 30, col: '#ffd23a' });
        break;
      case 'bossdown':
        this.add({ k: 'boom', x: e.x, y: e.y, life: 60, max: 60, size: 380, col: '#ffe14f' });
        cam.addShake(26);
        this.flash = 0.8;
        break;
    }
  }

  /** a speech bubble (taunts, KO quips) */
  bubble(x: number, y: number, text: string, col: string): void {
    this.ps = this.ps.filter((p) => !(p.k === 'bubble' && Math.abs(p.x - x) < 200 && Math.abs(p.y - y) < 200));
    this.add({ k: 'bubble', x, y, vy: -0.3, life: 170, max: 170, size: 22, col, text });
  }

  private ko(st: State, e: Ev, cam: Camera, tints: string[]): void {
    const stg = STAGES[st.stage];
    const side = e.a ?? 0;
    const col = tints[e.p] ?? '#ffffff';
    // a beam from the blast zone toward the stage
    const x = side === 1 ? stg.blast.l : side === 2 ? stg.blast.r : Math.max(stg.blast.l, Math.min(stg.blast.r, e.x));
    const y = side === 0 ? stg.blast.t : side === 3 ? stg.blast.b : Math.max(stg.blast.t, Math.min(stg.blast.b, e.y));
    const v = cam.viewRect(1, 1);
    void v;
    const ang = side === 1 ? 0 : side === 2 ? Math.PI : side === 0 ? Math.PI / 2 : side === 3 ? -Math.PI / 2 : -Math.PI / 2;
    this.add({ k: 'blast', x, y, life: 50, max: 50, size: 1, col, rot: ang });
    for (let i = 0; i < 30; i++) {
      const a = ang + (Math.random() - 0.5) * 1.2;
      const sp = 14 + Math.random() * 30;
      this.add({ k: 'spark', x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, life: 30, max: 30, size: 30, col: i % 3 ? col : '#ffffff', rot: a });
    }
    // the bro who landed it says something sweet
    const victim = st.fighters[e.p];
    const killer = victim && victim.lastHitBy >= 0 ? st.fighters[victim.lastHitBy] : null;
    if (killer && killer.act !== 29 && Math.random() < 0.7) this.bubble(killer.x, killer.y - FIGHTERS[killer.def].height - 40, KO_QUIPS[Math.floor(Math.random() * KO_QUIPS.length)], tints[killer.i] ?? '#fff');
    cam.addShake(24);
    this.flash = 0.35;
    this.flashCol = col;
    this.cheer = 1;
  }

  /** advance every particle one 60 Hz tick (the renderer calls it on a fixed clock, not per drawn frame) */
  update(): void {
    for (const p of this.ps) {
      p.x += p.vx;
      p.y += p.vy;
      if (p.screen) {
        p.x += p.vx;
        p.y += p.vy;
      }
      if (p.k === 'spark') {
        p.vx *= 0.82;
        p.vy *= 0.82;
      } else if (p.k === 'dust' || p.k === 'smoke') {
        p.vx *= 0.92;
        p.vy *= 0.92;
        p.size *= 1.02;
      } else if (p.k === 'shard') {
        p.vy += 0.7;
        p.rot += 0.2;
      } else if (p.k === 'confetti') {
        if (p.screen) p.vy += 0.00004;
        else p.vy += 0.4;
        p.rot += 0.15;
      }
      p.life--;
    }
    let n = 0;
    for (const p of this.ps) if (p.life > 0) this.ps[n++] = p;
    this.ps.length = n;
    this.flash = Math.max(0, this.flash - 0.04);
    this.cheer = Math.max(0, this.cheer - 0.006);
  }

  /** world-space particles */
  draw(c: CanvasRenderingContext2D): void {
    for (const p of this.ps) {
      if (p.screen) continue;
      const t = p.life / p.max;
      switch (p.k) {
        case 'spark': {
          c.strokeStyle = p.col;
          c.lineWidth = Math.max(1, p.size * 0.35 * t);
          c.lineCap = 'round';
          c.beginPath();
          c.moveTo(p.x, p.y);
          c.lineTo(p.x - p.vx * 2.2, p.y - p.vy * 2.2);
          c.stroke();
          break;
        }
        case 'star': {
          c.save();
          c.translate(p.x, p.y);
          c.rotate(p.rot);
          c.beginPath();
          const r = p.size * (1.2 - t * 0.4);
          for (let i = 0; i < 8; i++) {
            const rr = i % 2 ? r * 0.3 : r;
            c.lineTo(Math.cos((i * Math.PI) / 4) * rr, Math.sin((i * Math.PI) / 4) * rr);
          }
          c.closePath();
          c.fillStyle = rgbaAny(p.col, t);
          c.fill();
          c.restore();
          break;
        }
        case 'ring':
          c.strokeStyle = rgbaAny(p.col, t);
          c.lineWidth = 6 * t + 1;
          c.beginPath();
          c.arc(p.x, p.y, p.size * (1.6 - t), 0, Math.PI * 2);
          c.stroke();
          break;
        case 'dust':
        case 'smoke':
          c.fillStyle = p.k === 'dust' ? `rgba(240,235,255,${0.7 * t})` : p.col.replace(/[\d.]+\)$/, `${0.55 * t})`);
          c.beginPath();
          c.arc(p.x, p.y, p.size, 0, Math.PI * 2);
          c.fill();
          break;
        case 'text':
          c.save();
          c.font = `900 ${p.size}px Bungee, Impact, sans-serif`;
          c.textAlign = 'center';
          c.textBaseline = 'middle';
          c.globalAlpha = Math.min(1, t * 2);
          c.lineWidth = 7;
          c.strokeStyle = OUTLINE;
          c.lineJoin = 'round';
          c.strokeText(p.text ?? '', p.x, p.y);
          c.fillStyle = p.col;
          c.fillText(p.text ?? '', p.x, p.y);
          c.restore();
          break;
        case 'blast': {
          c.save();
          c.translate(p.x, p.y);
          c.rotate(p.rot);
          const len = 2600;
          const wd = 260 * (0.3 + t);
          c.globalAlpha = t;
          c.beginPath();
          c.moveTo(0, -wd * 0.3);
          c.lineTo(len, -wd);
          c.lineTo(len, wd);
          c.lineTo(0, wd * 0.3);
          c.closePath();
          c.save();
          c.clip();
          c.drawImage(blastSprite(p.col), 0, -wd, len, wd * 2);
          c.restore();
          c.globalAlpha = 1;
          c.fillStyle = `rgba(255,255,255,${0.9 * t})`;
          c.beginPath();
          c.moveTo(0, -wd * 0.08);
          c.lineTo(len * 0.8, -wd * 0.22);
          c.lineTo(len * 0.8, wd * 0.22);
          c.lineTo(0, wd * 0.08);
          c.fill();
          c.restore();
          break;
        }
        case 'boom': {
          const r = p.size * (1.3 - t * 0.6);
          c.globalAlpha = t;
          c.drawImage(boomSprite(), p.x - r, p.y - r, r * 2, r * 2);
          c.globalAlpha = 1;
          break;
        }
        case 'confetti':
        case 'shard':
          c.save();
          c.translate(p.x, p.y);
          c.rotate(p.rot);
          c.fillStyle = p.col;
          c.globalAlpha = Math.min(1, t * 3);
          c.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2);
          c.restore();
          break;
        case 'note':
          c.save();
          c.globalAlpha = t;
          c.fillStyle = p.col;
          c.strokeStyle = OUTLINE;
          c.lineWidth = 3;
          circle(c, p.x, p.y, p.size * 0.3, p.col, OUTLINE, 3);
          c.fillRect(p.x + p.size * 0.22, p.y - p.size, 5, p.size);
          c.restore();
          break;
        case 'bubble': {
          c.save();
          c.globalAlpha = Math.min(1, t * 4, (1 - t) * 10);
          c.font = '800 22px Nunito, sans-serif';
          if (!p.lines) {
            const words = (p.text ?? '').split(' ');
            const ls: string[] = [];
            let cur = '';
            for (const w of words) {
              if ((cur + ' ' + w).trim().length > 30) {
                ls.push(cur.trim());
                cur = w;
              } else cur += ' ' + w;
            }
            if (cur.trim()) ls.push(cur.trim());
            p.lines = ls;
            p.bw = Math.max(...ls.map((l) => c.measureText(l).width)) + 28;
          }
          const lines = p.lines;
          const bw = p.bw ?? 100;
          const bh = lines.length * 26 + 18;
          const bx = p.x - bw / 2;
          const by = p.y - bh;
          c.fillStyle = '#fff7ee';
          c.strokeStyle = OUTLINE;
          c.lineWidth = 4;
          c.beginPath();
          c.roundRect?.(bx, by, bw, bh, 14);
          c.moveTo(p.x - 10, p.y);
          c.lineTo(p.x, p.y + 16);
          c.lineTo(p.x + 10, p.y);
          c.fill();
          c.stroke();
          c.fillStyle = OUTLINE;
          c.textAlign = 'center';
          c.textBaseline = 'top';
          lines.forEach((l, i) => c.fillText(l, p.x, by + 10 + i * 26));
          c.fillStyle = p.col;
          c.fillRect(bx + 10, by + bh - 6, bw - 20, 3);
          c.restore();
          break;
        }
        case 'splat':
          c.save();
          c.globalAlpha = Math.min(1, t * 2);
          c.fillStyle = p.col;
          for (let i = 0; i < 7; i++) {
            const a = i * 0.9;
            circle(c, p.x + Math.cos(a) * p.size * 0.6, p.y + Math.sin(a) * p.size * 0.4, p.size * 0.35, p.col, null, 0);
          }
          circle(c, p.x, p.y, p.size * 0.55, p.col, null, 0);
          c.restore();
          break;
      }
    }
  }

  /** screen-space particles (confetti) */
  drawScreen(c: CanvasRenderingContext2D, w: number, h: number): void {
    for (const p of this.ps) {
      if (!p.screen) continue;
      c.save();
      c.translate(p.x * w, p.y * h);
      c.rotate(p.rot);
      c.fillStyle = p.col;
      c.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2);
      c.restore();
    }
  }

  /** smoke trails behind hard-launched fighters (called every rendered frame) */
  trails(st: State): void {
    for (const f of st.fighters) {
      if (f.act !== A.HITSTUN || f.hitlag > 0) continue;
      const sp = Math.sqrt(f.kx * f.kx + f.ky * f.ky);
      if (sp < 9) continue;
      this.add({ k: 'smoke', x: f.x + (Math.random() - 0.5) * 20, y: f.y - 50 + (Math.random() - 0.5) * 20, vx: 0, vy: 0, life: 30, max: 30, size: 10 + sp * 0.6, col: sp > 20 ? 'rgba(255,120,60,0.6)' : 'rgba(230,230,240,0.6)' });
    }
  }
}

function rgbaAny(col: string, a: number): string {
  if (col.startsWith('#')) return rgba(col, a);
  if (col.startsWith('rgba')) return col.replace(/[\d.]+\)$/, `${a})`);
  return col;
}
