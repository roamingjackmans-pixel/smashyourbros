// Lobby modifiers as bit flags (kept in the state so lookups are cheap and clone-safe).
import type { State } from './types';

export const MOD_IDS = [
  // physics
  'lowgrav',
  'heavygrav',
  'ice',
  'wind',
  'bouncy',
  'turbo',
  // body
  'giant',
  'tiny',
  'glass',
  'invisible',
  'swap',
  'mirror',
  // arena
  'lava',
  'shrink',
  'meteors',
  'topsy',
  'blackout',
  'itemrain',
  // rules
  'bounty',
  'potato',
  'suddenult',
  'audience',
  // FlashGames twists (D27): only the FlashGames mode turns these on; appended so the bits above never move
  'noshield',
  'bighead',
  'triple',
  'launch',
  'vampire',
] as const;
export type ModId = (typeof MOD_IDS)[number];

export function modBit(id: ModId): number {
  return 1 << MOD_IDS.indexOf(id);
}

export function modBits(ids: readonly string[]): number {
  let b = 0;
  for (const id of ids) {
    const i = MOD_IDS.indexOf(id as ModId);
    if (i >= 0) b |= 1 << i;
  }
  return b;
}

/** is this modifier on right now (lobby setting, or the Live Studio Audience's current pick) */
export function mod(st: State, id: ModId): boolean {
  const b = modBit(id);
  if (st.modBits & b) return true;
  return st.audience.left > 0 && st.audience.mod === id;
}

/** the twists the Live Studio Audience can vote in */
export const AUDIENCE_PICKS: ModId[] = ['lowgrav', 'heavygrav', 'giant', 'tiny', 'turbo', 'ice', 'wind', 'meteors', 'topsy', 'itemrain', 'glass', 'suddenult'];
