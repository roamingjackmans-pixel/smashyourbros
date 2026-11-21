// The platform-fighter camera: frames every living fighter with a margin, zooms smoothly, stays inside the
// stage's camera bounds, shakes on big hits.
import { A } from '../sim/acts';
import { STAGES } from '../sim/data';
import type { State } from '../sim/types';

export class Camera {
  x = 0;
  y = -200;
  zoom = 0.6;
  shake = 0;
  shakeX = 0;
  shakeY = 0;
  /** extra zoom-in (final hit, ultimates), 0..1 */
  punch = 0;
  punchX = 0;
  punchY = 0;
  rot = 0;

  update(st: State, w: number, h: number, dt: number): void {
    const stg = STAGES[st.stage];
    let minX = 1e9;
    let maxX = -1e9;
    let minY = 1e9;
    let maxY = -1e9;
    let n = 0;
    for (const f of st.fighters) {
      if (f.out || f.act === A.DEAD) continue;
      // don't chase fighters deep in the blast zones
      const fx = Math.max(stg.cam.l, Math.min(stg.cam.r, f.x));
      const fy = Math.max(stg.cam.t, Math.min(stg.cam.b, f.y));
      minX = Math.min(minX, fx - 160);
      maxX = Math.max(maxX, fx + 160);
      minY = Math.min(minY, fy - 260);
      maxY = Math.max(maxY, fy + 90);
      n++;
    }
    if (st.boss && !st.boss.dead) {
      minX = Math.min(minX, st.boss.x - 220);
      maxX = Math.max(maxX, st.boss.x + 220);
      minY = Math.min(minY, st.boss.y - 220);
      n++;
    }
    if (!n) {
      minX = -600;
      maxX = 600;
      minY = -500;
      maxY = 150;
    }
    // always keep a bit of the stage in view
    const s0 = stg.solids[0];
    minX = Math.min(minX, (s0.x1 + s0.x2) / 2 - 420);
    maxX = Math.max(maxX, (s0.x1 + s0.x2) / 2 + 420);
    maxY = Math.max(maxY, s0.y1 + 140);
    const bw = maxX - minX;
    const bh = maxY - minY;
    let tz = Math.min(w / bw, h / bh) * 0.92;
    tz = Math.max(Math.min(w, h) / 2600, Math.min(tz, Math.min(w, h) / 620));
    const tx = (minX + maxX) / 2;
    const ty = (minY + maxY) / 2;
    const k = 1 - Math.pow(0.0009, dt);
    const kz = 1 - Math.pow(0.004, dt);
    this.x += (tx - this.x) * k;
    this.y += (ty - this.y) * k;
    this.zoom += (tz - this.zoom) * kz;
    // stay inside the camera bounds
    const halfW = w / 2 / this.zoom;
    const halfH = h / 2 / this.zoom;
    const l = stg.cam.l + halfW;
    const r = stg.cam.r - halfW;
    this.x = l > r ? (stg.cam.l + stg.cam.r) / 2 : Math.max(l, Math.min(r, this.x));
    const t = stg.cam.t + halfH;
    const b = stg.cam.b - halfH;
    this.y = t > b ? (stg.cam.t + stg.cam.b) / 2 : Math.max(t, Math.min(b, this.y));
    // shake
    this.shake = Math.max(0, this.shake - dt * 60);
    const a = this.shake;
    this.shakeX = (Math.random() * 2 - 1) * a;
    this.shakeY = (Math.random() * 2 - 1) * a;
  }

  addShake(a: number): void {
    this.shake = Math.min(26, Math.max(this.shake, a));
  }

  /** apply the world transform to a context sized w x h (device pixels) */
  apply(c: CanvasRenderingContext2D, w: number, h: number): void {
    const z = this.zoom * (1 + this.punch * 0.9);
    const cx = this.x + (this.punchX - this.x) * this.punch;
    const cy = this.y + (this.punchY - this.y) * this.punch;
    c.setTransform(1, 0, 0, 1, 0, 0);
    c.translate(w / 2 + this.shakeX, h / 2 + this.shakeY);
    if (this.rot) c.rotate(this.rot);
    c.scale(z, z);
    c.translate(-cx, -cy);
  }

  worldToScreen(x: number, y: number, w: number, h: number): [number, number] {
    const z = this.zoom * (1 + this.punch * 0.9);
    const cx = this.x + (this.punchX - this.x) * this.punch;
    const cy = this.y + (this.punchY - this.y) * this.punch;
    let sx = (x - cx) * z;
    let sy = (y - cy) * z;
    if (this.rot) {
      const c = Math.cos(this.rot);
      const s = Math.sin(this.rot);
      [sx, sy] = [sx * c - sy * s, sx * s + sy * c];
    }
    return [w / 2 + sx, h / 2 + sy];
  }

  viewRect(w: number, h: number): { l: number; r: number; t: number; b: number } {
    const z = this.zoom * (1 + this.punch * 0.9);
    return { l: this.x - w / 2 / z, r: this.x + w / 2 / z, t: this.y - h / 2 / z, b: this.y + h / 2 / z };
  }
}
