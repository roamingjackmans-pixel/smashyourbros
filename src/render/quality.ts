// Render resolution (D22). The match canvas draws in logical pixels (its CSS size × device pixel ratio, up to 2)
// and its backing store is that size times a scale: capped by a pixel budget, and in Auto lowered a step at a time
// while frames come late, raised again once they have been on time for a while. Graphics quality is a per-device
// setting (this browser), not part of the profile.

export type GfxMode = 'auto' | 'high' | 'low';

const KEY = 'syb.gfx';
/** backing-store pixel budget per mode */
const BUDGET: Record<GfxMode, number> = { auto: 2560 * 1600, high: 3840 * 2160, low: 1280 * 720 };
/** the lowest scale Auto (and Low) may reach */
const FLOOR = 0.5;
/** the attract match behind the menus never needs more than this */
const BACKDROP_CAP = 0.6;
/** a frame later than this (ms) missed at least one 60 Hz refresh */
export const LATE_MS = 25;

let mode: GfxMode = load();

function load(): GfxMode {
  try {
    const v = localStorage.getItem(KEY);
    if (v === 'auto' || v === 'high' || v === 'low') return v;
  } catch {
    /* private mode */
  }
  return 'auto';
}

export function gfxMode(): GfxMode {
  return mode;
}

export function setGfxMode(m: GfxMode): void {
  mode = m;
  try {
    localStorage.setItem(KEY, m);
  } catch {
    /* private mode */
  }
}

/** the highest scale allowed for a logical w × h canvas */
export function scaleCap(w: number, h: number, backdrop: boolean, m: GfxMode = mode): number {
  let cap = Math.min(1, Math.sqrt(BUDGET[m] / Math.max(1, w * h)));
  if (backdrop) cap = Math.min(cap, BACKDROP_CAP);
  return Math.max(0.25, cap);
}

/** Adaptive scale for one renderer: feed it the time between animation frames. */
export class Resolution {
  /** the scale in use (≤ the cap) */
  scale = 1;
  private cap = 1;
  private frames = 0;
  private late = 0;
  private calm = 0;
  /** the scale that last ran too slowly, and when (no climbing back to it for a while) */
  private failedAt = 0;
  private failedScale = 2;

  /** the scale to render a logical w × h canvas at now */
  current(w: number, h: number, backdrop: boolean): number {
    const cap = scaleCap(w, h, backdrop);
    if (cap !== this.cap) {
      // a new cap (window resized, mode changed): start from it, then adapt again
      this.cap = cap;
      this.scale = cap;
      this.frames = this.late = this.calm = 0;
    }
    if (mode === 'high') this.scale = cap;
    return this.scale;
  }

  /** one animation-frame interval (ms) */
  note(ms: number, now: number): void {
    if (mode === 'high' || ms > 250 || ms <= 0) return;
    this.frames++;
    if (ms > LATE_MS) this.late++;
    if (this.frames < 45) return;
    const floor = Math.min(this.cap, FLOOR);
    if (this.late >= 3 && this.scale > floor + 0.001) {
      this.failedScale = this.scale;
      this.failedAt = now;
      this.scale = Math.max(floor, Math.round((this.scale - 0.1) * 100) / 100);
      this.calm = 0;
    } else if (this.late === 0) {
      this.calm += this.frames;
      const up = Math.min(this.cap, Math.round((this.scale + 0.1) * 100) / 100);
      const recentlyFailed = up >= this.failedScale - 0.001 && now - this.failedAt < 30000;
      if (this.calm >= 360 && up > this.scale && !recentlyFailed) {
        this.scale = up;
        this.calm = 0;
      }
    } else this.calm = 0;
    this.frames = this.late = 0;
  }
}
