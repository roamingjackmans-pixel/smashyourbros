import type { State } from './types';

/** push a presentation event (sounds, sparks, banners). Never read back by the simulation. */
export function ev(st: State, t: string, x: number, y: number, p = -1, a?: number, b?: number, s?: string): void {
  st.ev.push(a === undefined ? { t, x, y, p } : { t, x, y, p, a, b, s });
}
