// The hidden frame-time overlay (D22): ?fps in the address, or Settings → Graphics → Show frame times. It times
// every animation frame (menus and matches alike), how long the game's own code took in it, and shows the match
// canvas's resolution.
import { LATE_MS } from '../render/quality';

const KEY = 'syb.fps';

/** what the renderer reports about itself */
export const perfInfo = { w: 0, h: 0, scale: 1, logicalW: 0, logicalH: 0 };

let el: HTMLElement | null = null;
let raf = 0;
let last = 0;
let work = 0;
const frames: number[] = [];
const works: number[] = [];
let shownAt = 0;

/** add time (ms) the game spent in this frame's callbacks (match loop) */
export function perfWork(ms: number): void {
  if (el) work += ms;
}

export function fpsWanted(): boolean {
  if (new URLSearchParams(location.search).has('fps')) return true;
  try {
    return localStorage.getItem(KEY) === '1';
  } catch {
    return false;
  }
}

export function setFpsOverlay(on: boolean): void {
  try {
    localStorage.setItem(KEY, on ? '1' : '0');
  } catch {
    /* private mode */
  }
  if (on) startOverlay();
  else stopOverlay();
}

export function startOverlay(): void {
  if (el) return;
  el = document.createElement('div');
  el.id = 'fps';
  el.style.cssText =
    'position:fixed;left:8px;top:8px;z-index:99999;pointer-events:none;font:700 12px/1.35 ui-monospace,Consolas,monospace;color:#e8ffe8;background:rgba(0,0,0,0.72);padding:6px 9px;border-radius:8px;white-space:pre;';
  document.body.appendChild(el);
  last = performance.now();
  const loop = (now: number): void => {
    raf = requestAnimationFrame(loop);
    const dt = now - last;
    last = now;
    if (dt > 0 && dt < 1000) {
      frames.push(dt);
      works.push(work);
    }
    work = 0;
    if (frames.length > 240) {
      frames.splice(0, frames.length - 240);
      works.splice(0, works.length - 240);
    }
    if (now - shownAt > 250) {
      shownAt = now;
      render();
    }
  };
  raf = requestAnimationFrame(loop);
}

function stopOverlay(): void {
  cancelAnimationFrame(raf);
  el?.remove();
  el = null;
  frames.length = 0;
  works.length = 0;
}

function render(): void {
  if (!el || !frames.length) return;
  // the last second
  let sum = 0;
  let n = 0;
  for (let i = frames.length - 1; i >= 0 && sum < 1000; i--) {
    sum += frames[i];
    n++;
  }
  const recent = frames.slice(-n);
  const sorted = [...recent].sort((a, b) => a - b);
  const p = (q: number): number => sorted[Math.min(sorted.length - 1, Math.floor(q * sorted.length))];
  const avg = sum / n;
  const late = recent.filter((d) => d > LATE_MS).length;
  const w = works.slice(-n);
  const wAvg = w.reduce((a, b) => a + b, 0) / Math.max(1, w.length);
  const wMax = Math.max(0, ...w);
  const res = perfInfo.w ? `${perfInfo.w}×${perfInfo.h} (×${perfInfo.scale.toFixed(2)} of ${perfInfo.logicalW}×${perfInfo.logicalH})` : '—';
  el.textContent =
    `${(1000 / avg).toFixed(0)} fps   frame ${avg.toFixed(1)} ms\n` +
    `p50 ${p(0.5).toFixed(1)}  p95 ${p(0.95).toFixed(1)}  worst ${p(1).toFixed(1)} ms\n` +
    `late (>${LATE_MS} ms) ${late}/s\n` +
    `game code ${wAvg.toFixed(2)} ms avg, ${wMax.toFixed(1)} max\n` +
    `canvas ${res}`;
}
