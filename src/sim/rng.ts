// Seeded xorshift32 kept in the state, so every machine rolls the same numbers.
import type { State } from './types';

export function seedRng(seed: number): number {
  let s = (seed ^ 0x9e3779b9) >>> 0;
  if (s === 0) s = 0x1234567;
  return s;
}

/** next raw u32, advancing state.rng */
export function nextU32(st: State): number {
  let x = st.rng >>> 0;
  x ^= x << 13;
  x >>>= 0;
  x ^= x >>> 17;
  x ^= x << 5;
  x >>>= 0;
  st.rng = x;
  return x;
}

/** integer in [0, n) */
export function rint(st: State, n: number): number {
  return nextU32(st) % n;
}

/** float in [0, 1) */
export function rfloat(st: State): number {
  return nextU32(st) / 4294967296;
}

export function rpick<T>(st: State, arr: readonly T[]): T {
  return arr[rint(st, arr.length)];
}
