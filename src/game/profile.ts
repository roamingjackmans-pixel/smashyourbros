// The save: unlocked fighters, task progress, lifetime stats, story and classic progress, settings.
// Saved to the account (Shoallhell's server, /syb/profile) or to this browser when playing offline.
import { ROSTER } from '../sim/data';
import type { State } from '../sim/types';

export interface Settings {
  tapJumpKb: boolean;
  tapJumpPad: boolean;
  shake: number;
  delay: number;
  keys: Record<string, string[]>[];
  palette: Record<string, number>;
}

export interface Profile {
  v: 1;
  unlocked: string[];
  /** tasks finished whose challenger fight hasn't been won yet */
  challengers: string[];
  done: string[];
  stats: Record<string, number>;
  used: Record<string, number>;
  wins: Record<string, number>;
  story: { cleared: string[] };
  /** best Classic intensity cleared per fighter */
  classic: Record<string, number>;
  settings: Settings;
  seenIntro: boolean;
  /** last 12 matches */
  recent: { at: number; mode: string; result: string; fighter: string; kos: number }[];
}

export const STARTERS = ['kit', 'clank', 'granny', 'zippy'];

export function newProfile(): Profile {
  return {
    v: 1,
    unlocked: [...STARTERS],
    challengers: [],
    done: [],
    stats: {},
    used: {},
    wins: {},
    story: { cleared: [] },
    classic: {},
    settings: { tapJumpKb: false, tapJumpPad: true, shake: 1, delay: 2, keys: [], palette: {} },
    seenIntro: false,
    recent: [],
  };
}

export function fixProfile(p: Partial<Profile> | null | undefined): Profile {
  const d = newProfile();
  if (!p || typeof p !== 'object') return d;
  const out = { ...d, ...p, settings: { ...d.settings, ...(p.settings ?? {}) }, story: { ...d.story, ...(p.story ?? {}) } } as Profile;
  for (const s of STARTERS) if (!out.unlocked.includes(s)) out.unlocked.push(s);
  out.unlocked = out.unlocked.filter((id) => ROSTER.some((r) => r.def.id === id));
  return out;
}

export function stat(p: Profile, k: string): number {
  return p.stats[k] ?? 0;
}

export function add(p: Profile, k: string, n = 1): void {
  p.stats[k] = (p.stats[k] ?? 0) + n;
}

export interface MatchContext {
  mode: 'versus' | 'online' | 'story' | 'classic' | 'challenger' | 'practice';
  /** the slots played by this machine's humans */
  local: number[];
}

/** fold a finished match into the lifetime stats */
export function recordMatch(p: Profile, st: State, ctx: MatchContext): void {
  if (ctx.mode === 'practice') return;
  const humans = st.fighters.filter((f) => ctx.local.includes(f.i));
  if (!humans.length) return;
  add(p, 'matches');
  if (ctx.mode === 'online') add(p, 'online');
  if (st.cfg.mods.length) add(p, 'modMatches');
  const ffa = !st.cfg.teams && st.fighters.filter((f) => !st.cfg.players[f.i]?.grunt).length >= 4;
  for (const f of humans) {
    const id = st.cfg.players[f.i].fighter;
    p.used[id] = (p.used[id] ?? 0) + 1;
    add(p, 'kos', f.st.kos);
    add(p, 'falls', f.st.falls);
    add(p, 'sds', f.st.sds);
    add(p, 'parries', f.st.parries);
    add(p, 'techs', f.st.techs);
    add(p, 'smashes', f.st.smashes);
    add(p, 'items', f.st.items);
    add(p, 'meteors', f.st.meteors);
    add(p, 'ults', f.st.ults);
    add(p, 'onbeat', f.st.onbeat);
    add(p, 'damage', Math.round(f.st.dealt));
    const won = st.winner.includes(f.i);
    if (won) {
      add(p, 'wins');
      p.wins[id] = (p.wins[id] ?? 0) + 1;
      if (ffa && st.cfg.mode === 'stock') add(p, 'ffaWins');
    }
    p.recent.unshift({ at: Date.now(), mode: ctx.mode, result: won ? 'win' : 'loss', fighter: id, kos: f.st.kos });
  }
  p.recent = p.recent.slice(0, 12);
}
