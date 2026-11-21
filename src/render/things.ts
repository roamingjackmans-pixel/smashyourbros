// Projectiles, items, hazards, paint and the boss: all original props.
import { FIGHTERS } from '../sim/data';
import { ITEMS } from '../sim/items';
import { lavaY } from '../sim/sim';
import { STAGES } from '../sim/data';
import { surfaces } from '../sim/stage';
import type { Item, Proj, State } from '../sim/types';
import { circle, ellipse, fillStroke, OUTLINE, rgba, rrect, shade } from './art';

const PROJ_COL: Record<string, string> = {
  bolt: '#7fe3ff',
  comet: '#ffb13a',
};

export function drawProj(c: CanvasRenderingContext2D, p: Proj, t: number, tints: string[]): void {
  const d = FIGHTERS[p.fd].projs[p.pk];
  const s = d.chargeable ? 1 + p.charge * 0.9 : 1;
  const r = d.r * s;
  const col = PROJ_COL[d.kind] ?? tints[p.o] ?? '#ffffff';
  const custom = PROJ_DRAW[d.kind];
  if (custom) {
    custom(c, p, r, t, col);
    return;
  }
  // default: a glowing orb with a trail
  c.save();
  c.globalCompositeOperation = 'lighter';
  for (let i = 4; i > 0; i--) circle(c, p.x - p.vx * i * 1.3, p.y - p.vy * i * 1.3, r * (1 - i * 0.15), rgba(col.startsWith('#') ? col : '#ffffff', 0.18), null, 0);
  c.restore();
  circle(c, p.x, p.y, r, col, OUTLINE, 3);
  circle(c, p.x - r * 0.3, p.y - r * 0.3, r * 0.35, 'rgba(255,255,255,0.85)', null, 0);
}

type PD = (c: CanvasRenderingContext2D, p: Proj, r: number, t: number, col: string) => void;

export const PROJ_DRAW: Record<string, PD> = {
  bolt: (c, p, r, t, col) => {
    c.save();
    c.globalCompositeOperation = 'lighter';
    for (let i = 5; i > 0; i--) circle(c, p.x - p.vx * i, p.y - p.vy * i, r * (1 - i * 0.12), rgba(col, 0.22), null, 0);
    c.restore();
    circle(c, p.x, p.y, r * 1.1, '#ffffff', null, 0);
    circle(c, p.x, p.y, r * 0.75, col, null, 0);
    void t;
  },
  comet: (c, p, r, t) => {
    c.save();
    c.globalCompositeOperation = 'lighter';
    for (let i = 8; i > 0; i--) circle(c, p.x, p.y - i * 26, r * (1 - i * 0.08), `rgba(255,${120 + i * 10},40,0.18)`, null, 0);
    c.restore();
    circle(c, p.x, p.y, r, '#ff8a2a', OUTLINE, 6);
    circle(c, p.x - r * 0.2, p.y - r * 0.2, r * 0.6, '#ffd27a', null, 0);
    circle(c, p.x + r * 0.3, p.y + r * 0.2, r * 0.18, '#c4561a', null, 0);
    void t;
  },
};

export function registerProjDraw(kind: string, fn: PD): void {
  PROJ_DRAW[kind] = fn;
}

// ------------------------------------------------------------------ items

export function drawItem(c: CanvasRenderingContext2D, it: Item, t: number): void {
  const d = ITEMS[it.k];
  const r = d.r;
  c.save();
  c.translate(it.x, it.y);
  if (it.st === 2) c.rotate(t * 0.35);
  else if (it.st === 0 && d.kind !== 'coin') c.translate(0, -r - Math.abs(Math.sin(t * 0.08)) * 3);
  else if (d.kind === 'coin') c.translate(0, -r);
  const ol = OUTLINE;
  switch (d.id) {
    case 'fizz':
      rrect(c, -r * 0.7, -r, r * 1.4, r * 2, 5);
      fillStroke(c, '#ff3a6e', ol, 3);
      c.fillStyle = '#fff';
      c.fillRect(-r * 0.7, -r * 0.2, r * 1.4, r * 0.4);
      c.strokeStyle = ol;
      c.lineWidth = 3;
      c.beginPath();
      c.moveTo(0, -r);
      c.quadraticCurveTo(6, -r - 10, 2, -r - 16);
      c.stroke();
      if (t % 10 < 5) circle(c, 2, -r - 17, 4, '#ffe14f', null, 0);
      break;
    case 'chicken':
      ellipse(c, 0, 0, r * 0.9, r * 0.55, 0.2, '#ffe14f', ol, 3);
      circle(c, r * 0.9, -r * 0.4, r * 0.35, '#ffe14f', ol, 3);
      c.fillStyle = '#ff6a3a';
      c.beginPath();
      c.moveTo(r * 1.2, -r * 0.4);
      c.lineTo(r * 1.55, -r * 0.3);
      c.lineTo(r * 1.2, -r * 0.2);
      c.fill();
      circle(c, r * 0.95, -r * 0.5, 2, ol, null, 0);
      break;
    case 'mic':
      c.fillStyle = '#9aa3b5';
      c.fillRect(-3, -r, 6, r * 2);
      c.strokeStyle = ol;
      c.lineWidth = 2;
      c.strokeRect(-3, -r, 6, r * 2);
      circle(c, 0, -r - 6, 8, '#2b2633', ol, 3);
      ellipse(c, 0, r, 12, 4, 0, '#2b2633', ol, 2);
      break;
    case 'bat':
      rrect(c, -5, -r * 0.4, 10, r * 1.6, 4);
      fillStroke(c, '#3a7bff', ol, 3);
      rrect(c, -r * 0.6, -r * 1.3, r * 1.2, r * 1.0, 8);
      fillStroke(c, '#ffe14f', ol, 3);
      c.fillStyle = ol;
      c.font = '900 10px Bungee, Impact';
      c.textAlign = 'center';
      c.fillText('#1', 0, -r * 0.7);
      break;
    case 'mallet':
      c.fillStyle = '#b0763f';
      c.fillRect(-3, -r * 0.4, 6, r * 1.5);
      rrect(c, -r, -r, r * 2, r * 0.8, 6);
      fillStroke(c, '#ff6fb5', ol, 3);
      break;
    case 'popcorn':
    case 'wings':
      c.beginPath();
      c.moveTo(-r * 0.8, -r * 0.5);
      c.lineTo(r * 0.8, -r * 0.5);
      c.lineTo(r * 0.6, r);
      c.lineTo(-r * 0.6, r);
      c.closePath();
      fillStroke(c, d.id === 'popcorn' ? '#ffcf3a' : '#ff6a3a', ol, 3);
      for (let i = -1; i <= 1; i++) circle(c, i * r * 0.45, -r * 0.6, r * 0.35, d.id === 'popcorn' ? '#fff6d8' : '#c4561a', ol, 2);
      break;
    case 'hype':
      rrect(c, -r * 0.6, -r, r * 1.2, r * 2, 4);
      fillStroke(c, '#3affd5', ol, 3);
      c.fillStyle = ol;
      c.beginPath();
      c.moveTo(2, -r * 0.6);
      c.lineTo(-5, 2);
      c.lineTo(1, 2);
      c.lineTo(-2, r * 0.6);
      c.lineTo(6, -2);
      c.lineTo(0, -2);
      c.closePath();
      c.fill();
      break;
    case 'protein':
      rrect(c, -r * 0.65, -r * 0.8, r * 1.3, r * 1.9, 6);
      fillStroke(c, '#f4f1ea', ol, 3);
      rrect(c, -r * 0.7, -r * 1.2, r * 1.4, r * 0.5, 4);
      fillStroke(c, '#8a55ff', ol, 3);
      c.fillStyle = '#8a55ff';
      c.font = '900 9px Bungee, Impact';
      c.textAlign = 'center';
      c.fillText('BRO', 0, r * 0.2);
      break;
    case 'star': {
      c.beginPath();
      for (let i = 0; i < 10; i++) {
        const rr = i % 2 ? r * 0.45 : r * 1.1;
        const a = (i * Math.PI) / 5 - Math.PI / 2 + t * 0.03;
        c.lineTo(Math.cos(a) * rr, Math.sin(a) * rr);
      }
      c.closePath();
      fillStroke(c, '#ffcf3a', ol, 3);
      break;
    }
    case 'shrink':
    case 'freeze':
    case 'cannon':
    case 'laser': {
      const col = { shrink: '#ff7af2', freeze: '#7fe3ff', cannon: '#ff3a6e', laser: '#ff4a4a' }[d.id] ?? '#fff';
      rrect(c, -r, -r * 0.4, r * 1.7, r * 0.8, 5);
      fillStroke(c, '#c9d2e3', ol, 3);
      rrect(c, r * 0.6, -r * 0.3, r * 0.6, r * 0.6, 3);
      fillStroke(c, col, ol, 2.5);
      c.fillStyle = '#5d6478';
      c.fillRect(-r * 0.7, r * 0.3, r * 0.5, r * 0.6);
      break;
    }
    case 'pie':
      ellipse(c, 0, 2, r, r * 0.45, 0, '#c4893a', ol, 3);
      ellipse(c, 0, -2, r * 0.9, r * 0.4, 0, '#fff6f0', ol, 2.5);
      circle(c, 0, -r * 0.3, 4, '#ff3a6e', null, 0);
      break;
    case 'remote':
      rrect(c, -r * 0.4, -r, r * 0.8, r * 2, 5);
      fillStroke(c, '#2b2633', ol, 3);
      circle(c, 0, -r * 0.6, 3.5, '#ff4a4a', null, 0);
      for (let i = 0; i < 3; i++) c.fillRect(-4, -r * 0.1 + i * 7, 8, 4);
      break;
    case 'bowling':
      circle(c, 0, 0, r, '#3a1a6e', ol, 3);
      circle(c, -r * 0.3, -r * 0.3, 3, '#140a2a', null, 0);
      circle(c, r * 0.1, -r * 0.45, 3, '#140a2a', null, 0);
      circle(c, r * 0.1, -r * 0.1, 3, '#140a2a', null, 0);
      break;
    case 'glue':
      ellipse(c, 0, r * 0.4, r * 1.2, r * 0.45, 0, it.st === 3 ? 'rgba(255,240,140,0.85)' : '#ffe14f', ol, 3);
      if (it.st !== 3) {
        rrect(c, -r * 0.4, -r * 0.6, r * 0.8, r, 4);
        fillStroke(c, '#fff', ol, 3);
      }
      break;
    case 'spring':
      rrect(c, -r, r * 0.2, r * 2, r * 0.5, 4);
      fillStroke(c, '#5d6478', ol, 3);
      c.strokeStyle = '#c9d2e3';
      c.lineWidth = 4;
      c.beginPath();
      for (let i = 0; i < 4; i++) {
        c.moveTo(-r * 0.6, r * 0.1 - i * 5);
        c.lineTo(r * 0.6, r * 0.1 - i * 5 - 2);
      }
      c.stroke();
      rrect(c, -r, -r * 0.4, r * 2, r * 0.3, 3);
      fillStroke(c, '#ff3a6e', ol, 3);
      break;
    case 'box':
      rrect(c, -r, -r, r * 2, r * 2, 6);
      fillStroke(c, '#b26bff', ol, 3);
      c.fillStyle = '#ffe14f';
      c.font = `900 ${r * 1.3}px Bungee, Impact`;
      c.textAlign = 'center';
      c.textBaseline = 'middle';
      c.fillText('?', 0, 2);
      break;
    case 'capsule':
      ellipse(c, 0, 0, r * 1.1, r * 0.75, 0, '#fff', ol, 3);
      c.save();
      c.beginPath();
      c.ellipse(0, 0, r * 1.1, r * 0.75, 0, 0, Math.PI * 2);
      c.clip();
      c.fillStyle = '#ff3a6e';
      c.fillRect(-r * 1.2, -r, r * 1.2, r * 2);
      c.restore();
      c.strokeStyle = ol;
      c.lineWidth = 3;
      c.beginPath();
      c.ellipse(0, 0, r * 1.1, r * 0.75, 0, 0, Math.PI * 2);
      c.stroke();
      break;
    case 'orb': {
      const pulse = 1 + Math.sin(t * 0.2) * 0.08;
      c.save();
      c.globalCompositeOperation = 'lighter';
      circle(c, 0, 0, r * 1.9 * pulse, 'rgba(255,200,60,0.18)', null, 0);
      circle(c, 0, 0, r * 1.4 * pulse, 'rgba(255,80,160,0.22)', null, 0);
      c.restore();
      const g = c.createRadialGradient(-r * 0.3, -r * 0.3, 2, 0, 0, r);
      g.addColorStop(0, '#fffbe0');
      g.addColorStop(0.5, '#ffcf3a');
      g.addColorStop(1, '#ff3a6e');
      c.fillStyle = g;
      c.beginPath();
      c.arc(0, 0, r, 0, Math.PI * 2);
      c.fill();
      c.strokeStyle = ol;
      c.lineWidth = 3;
      c.stroke();
      c.fillStyle = '#fff';
      c.font = `900 ${r}px Bungee, Impact`;
      c.textAlign = 'center';
      c.textBaseline = 'middle';
      c.fillText('B', 0, 2);
      break;
    }
    case 'coin':
      ellipse(c, 0, 0, r * Math.abs(Math.cos(t * 0.15)) + 2, r, 0, '#ffcf3a', ol, 2.5);
      break;
  }
  c.restore();
}

// ------------------------------------------------------------------ hazards, lava, paint, hill, boss

export function drawHazards(c: CanvasRenderingContext2D, st: State, t: number, tints: string[]): void {
  for (const h of st.hazards) {
    if (h.k === 'cannon') {
      if (h.t < 50) {
        c.fillStyle = `rgba(255,80,60,${0.5 + 0.4 * Math.sin(t * 0.4)})`;
        c.font = '900 60px Bungee, Impact';
        c.textAlign = 'center';
        c.fillText('!', h.vx < 0 ? h.x - 260 : h.x + 260, h.y);
        continue;
      }
      circle(c, h.x, h.y, h.r, '#2b2633', OUTLINE, 5);
      circle(c, h.x - h.r * 0.3, h.y - h.r * 0.3, h.r * 0.25, '#5d6478', null, 0);
      c.fillStyle = 'rgba(200,200,210,0.4)';
      for (let i = 1; i < 5; i++) circle(c, h.x - h.vx * i * 2.5, h.y, h.r * (0.7 - i * 0.12), 'rgba(220,220,230,0.35)', null, 0);
      continue;
    }
    if (h.k === 'light' || h.k === 'sign' || h.k === 'debris') {
      if (h.t < 60) {
        const stg = STAGES[st.stage];
        c.strokeStyle = `rgba(255,220,80,${0.4 + 0.4 * Math.sin(t * 0.4)})`;
        c.lineWidth = 6;
        c.beginPath();
        c.ellipse(h.x, stg.solids[0].y1, 80, 16, 0, 0, Math.PI * 2);
        c.stroke();
        continue;
      }
      c.save();
      c.translate(h.x, h.y);
      c.rotate(h.t * (h.k === 'debris' ? 0.12 : 0.02));
      if (h.k === 'light') {
        rrect(c, -50, -24, 100, 34, 8);
        fillStroke(c, '#3a3346', OUTLINE, 5);
        for (let i = -1; i <= 1; i++) circle(c, i * 30, 14, 12, '#fff6c2', OUTLINE, 3);
      } else if (h.k === 'sign') {
        rrect(c, -60, -26, 120, 52, 8);
        fillStroke(c, '#141826', OUTLINE, 5);
        c.fillStyle = (t >> 3) % 2 ? '#ff3a8c' : '#3affd5';
        c.font = '900 22px Bungee, Impact';
        c.textAlign = 'center';
        c.textBaseline = 'middle';
        c.fillText('OPEN', 0, 2);
      } else {
        c.beginPath();
        c.moveTo(-36, -10);
        c.lineTo(-10, -34);
        c.lineTo(30, -20);
        c.lineTo(38, 16);
        c.lineTo(0, 34);
        c.lineTo(-30, 22);
        c.closePath();
        fillStroke(c, '#9aa3b5', OUTLINE, 5);
        c.fillStyle = '#2f5fd0';
        c.fillRect(-14, -12, 26, 18);
      }
      c.restore();
      continue;
    }
    if (h.k === 'meteor') {
      if (h.t < 60) {
        // warning marker on the floor below
        const stg = STAGES[st.stage];
        const y = stg.solids[0].y1;
        c.strokeStyle = `rgba(255,80,60,${0.4 + 0.4 * Math.sin(t * 0.4)})`;
        c.lineWidth = 6;
        c.beginPath();
        c.ellipse(h.x, y, 70, 14, 0, 0, Math.PI * 2);
        c.stroke();
        continue;
      }
      c.save();
      c.globalCompositeOperation = 'lighter';
      for (let i = 1; i < 6; i++) circle(c, h.x - h.vx * i * 2, h.y - h.vy * i * 2, h.r * (1 - i * 0.12), 'rgba(255,140,40,0.2)', null, 0);
      c.restore();
      circle(c, h.x, h.y, h.r, '#7a4a3a', OUTLINE, 4);
      circle(c, h.x - h.r * 0.3, h.y - h.r * 0.2, h.r * 0.25, '#5a3428', null, 0);
    } else if (h.k === 'roadie') {
      // a burly roadie charging with an amp case
      rrect(c, h.x - 30, h.y - 70, 60, 60, 8);
      fillStroke(c, '#2b2633', OUTLINE, 4);
      circle(c, h.x, h.y - 90, 16, '#e9b48a', OUTLINE, 3);
      c.fillStyle = '#ffe14f';
      c.font = '900 14px Bungee, Impact';
      c.textAlign = 'center';
      c.fillText('CREW', h.x, h.y - 36);
    } else if (h.k === 'laughtrack') {
      c.fillStyle = tints[h.o] ?? '#ffe14f';
      c.font = '900 40px Bungee, Impact';
      c.textAlign = 'center';
      c.fillText('HA HA HA!', h.x, h.y - 60 - (h.t % 30));
    } else if (h.k === 'cameraman') {
      rrect(c, h.x - 26, h.y - 60, 52, 34, 6);
      fillStroke(c, '#5d6478', OUTLINE, 4);
      circle(c, h.x + 30, h.y - 44, 12, '#1b0f24', OUTLINE, 3);
      if (h.t > 40 && h.t < 50) circle(c, h.x + 30, h.y - 44, 60, 'rgba(255,255,255,0.8)', null, 0);
    }
  }
}

export function drawPaint(c: CanvasRenderingContext2D, st: State, tints: string[]): void {
  const ss = surfaces(STAGES[st.stage], st.frame, !!st.cfg.flat);
  for (const p of st.paint) {
    const s = ss[p.s];
    if (!s) continue;
    const col = tints[p.owner] ?? '#ff4fd2';
    c.fillStyle = rgba(col.startsWith('#') ? col : '#ff4fd2', Math.min(0.85, p.t / 120));
    rrect(c, Math.max(s.x1, p.x1), s.y1 - 4, Math.min(s.x2, p.x2) - Math.max(s.x1, p.x1), 12, 6);
    c.fill();
    for (let x = Math.max(s.x1, p.x1) + 12; x < Math.min(s.x2, p.x2) - 8; x += 38) circle(c, x, s.y1 + 10, 5, rgba(col.startsWith('#') ? col : '#ff4fd2', 0.6), null, 0);
  }
}

export function drawLava(c: CanvasRenderingContext2D, st: State, t: number): void {
  if (!st.cfg.mods.includes('lava')) return;
  const y = lavaY(st);
  const stg = STAGES[st.stage];
  const warn = st.lava < 0;
  c.fillStyle = warn ? `rgba(255,80,40,${0.25 + 0.2 * Math.sin(t * 0.3)})` : '#ff5a1f';
  c.beginPath();
  c.moveTo(stg.blast.l, stg.blast.b + 400);
  for (let x = stg.blast.l; x <= stg.blast.r; x += 60) c.lineTo(x, y + Math.sin(x * 0.01 + t * 0.08) * 10);
  c.lineTo(stg.blast.r, stg.blast.b + 400);
  c.closePath();
  c.fill();
  if (!warn) {
    c.fillStyle = '#ffd23a';
    for (let x = stg.blast.l; x <= stg.blast.r; x += 140) circle(c, x + ((t * 2) % 140), y + 20 + Math.sin(x + t * 0.1) * 6, 10, '#ffd23a', null, 0);
  }
}

export function drawHill(c: CanvasRenderingContext2D, st: State, t: number, tints: string[]): void {
  if (st.cfg.mode !== 'koth') return;
  const h = st.hill;
  const col = h.holder >= 0 ? (tints[h.holder] ?? '#ffe14f') : '#ffffff';
  c.fillStyle = rgba(col.startsWith('#') ? col : '#ffffff', 0.22 + 0.08 * Math.sin(t * 0.15));
  c.fillRect(h.x - h.w / 2, h.y - 260, h.w, 260);
  c.strokeStyle = col;
  c.lineWidth = 5;
  c.setLineDash([16, 10]);
  c.strokeRect(h.x - h.w / 2, h.y - 260, h.w, 260);
  c.setLineDash([]);
  c.fillStyle = col;
  c.font = '900 30px Bungee, Impact';
  c.textAlign = 'center';
  c.fillText('THE HILL', h.x, h.y - 280);
}

export function drawBoss(c: CanvasRenderingContext2D, st: State, t: number): void {
  const b = st.boss;
  if (!b || b.dead) return;
  const flash = b.flash > 0;
  c.save();
  c.translate(b.x, b.y);
  // crane arms
  c.strokeStyle = OUTLINE;
  c.lineWidth = 22;
  c.lineCap = 'round';
  c.beginPath();
  c.moveTo(-60, -40);
  c.lineTo(-260, -260 + Math.sin(t * 0.05) * 20);
  c.moveTo(60, -40);
  c.lineTo(260, -260 + Math.cos(t * 0.05) * 20);
  c.stroke();
  c.strokeStyle = '#5d6478';
  c.lineWidth = 14;
  c.stroke();
  // camera body
  rrect(c, -170, -110, 300, 200, 26);
  fillStroke(c, flash ? '#ffffff' : '#2b2633', OUTLINE, 8);
  rrect(c, -150, -150, 120, 50, 12);
  fillStroke(c, '#3a3346', OUTLINE, 6);
  // lens (weak point)
  circle(c, 0, 20, 92, '#141018', OUTLINE, 8);
  const g = c.createRadialGradient(-20, 0, 6, 0, 20, 80);
  g.addColorStop(0, '#ffffff');
  g.addColorStop(0.25, '#ff3a6e');
  g.addColorStop(1, '#2a0820');
  c.fillStyle = g;
  c.beginPath();
  c.arc(0, 20, 70, 0, Math.PI * 2);
  c.fill();
  circle(c, -24, -4, 16, 'rgba(255,255,255,0.8)', null, 0);
  // the REC light
  if ((t >> 4) % 2) circle(c, 110, -80, 12, '#ff2a2a', OUTLINE, 3);
  c.fillStyle = '#ffe14f';
  c.font = '900 26px Bungee, Impact';
  c.textAlign = 'center';
  c.fillText('BRO-ADCAST', -20, -125);
  c.restore();
  // laser sweep
  if (b.act === 0 && b.af % 260 > 50 && b.af % 260 < 150) {
    const stg = STAGES[st.stage];
    const lx = b.v[0];
    c.save();
    c.globalCompositeOperation = 'lighter';
    c.strokeStyle = 'rgba(255,60,110,0.6)';
    c.lineWidth = 40;
    c.beginPath();
    c.moveTo(b.x, b.y + 20);
    c.lineTo(lx, stg.solids[0].y1);
    c.stroke();
    c.strokeStyle = 'rgba(255,255,255,0.9)';
    c.lineWidth = 10;
    c.stroke();
    c.restore();
  } else if (b.af % 260 < 50 && b.act === 0) {
    c.strokeStyle = `rgba(255,60,110,${0.3 + 0.3 * Math.sin(t * 0.5)})`;
    c.lineWidth = 3;
    c.beginPath();
    c.moveTo(b.x, b.y + 20);
    c.lineTo(STAGES[st.stage].solids[0].x1, STAGES[st.stage].solids[0].y1);
    c.stroke();
  }
  void shade;
}
