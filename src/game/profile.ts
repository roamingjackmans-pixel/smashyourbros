// The save: unlocked fighters, task progress, lifetime stats, story and classic progress, settings.
// Saved to the account (Shoallhell's server, /syb/profile) or to this browser when playing offline.
import { ROSTER } from '../sim/data';
import type { State } from '../sim/types';
import { normalizeMenuPad, normalizePadLayouts, type MenuPad, type PadLayout } from './padLayout';
import { matchExtra } from './stats';

/** which button pictures prompts show (D23): Auto follows the last device used */
export type PromptStyle = 'auto' | 'keyboard' | 'xbox' | 'playstation' | 'switch' | 'generic';
export const PROMPT_STYLES: readonly PromptStyle[] = ['auto', 'keyboard', 'xbox', 'playstation', 'switch', 'generic'];

export interface Settings {
  tapJumpKb: boolean;
  tapJumpPad: boolean;
  shake: number;
  delay: number;
  keys: Record<string, string[]>[];
  palette: Record<string, number>;
  /** controller layout per player port (P1–P4) */
  pads: PadLayout[];
  /** the menu confirm / back buttons for every pad */
  menuPad: MenuPad;
  prompts: PromptStyle;
  /** rumble strength, 0 = off */
  rumble: number;
  /** Nintendo pads: the button labelled A is A (right = confirm), not the bottom one */
  nintendoLabels: boolean;
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
  /** move id → times used by this player's fighters (the favourite move) */
  moves: Record<string, number>;
  /** achievement id → when it unlocked (unix seconds) */
  ach: Record<string, number>;
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
    settings: { tapJumpKb: false, tapJumpPad: true, shake: 1, delay: 2, keys: [], palette: {}, pads: normalizePadLayouts(null, true), menuPad: normalizeMenuPad(null), prompts: 'auto', rumble: 1, nintendoLabels: true },
    seenIntro: false,
    recent: [],
    moves: {},
    ach: {},
  };
}

export function fixProfile(p: Partial<Profile> | null | undefined): Profile {
  const d = newProfile();
  if (!p || typeof p !== 'object') return d;
  const out = { ...d, ...p, settings: { ...d.settings, ...(p.settings ?? {}) }, story: { ...d.story, ...(p.story ?? {}) } } as Profile;
  const obj = (v: unknown): v is Record<string, number> => !!v && typeof v === 'object' && !Array.isArray(v);
  if (!obj(out.stats)) out.stats = {};
  if (!obj(out.used)) out.used = {};
  if (!obj(out.wins)) out.wins = {};
  if (!obj(out.moves)) out.moves = {};
  if (!obj(out.ach)) out.ach = {};
  if (!Array.isArray(out.recent)) out.recent = [];
  const st = out.settings;
  // older saves: one tap-jump switch for every pad becomes each port's own
  st.pads = normalizePadLayouts((p.settings as Partial<Settings> | undefined)?.pads, st.tapJumpPad !== false);
  st.menuPad = normalizeMenuPad(st.menuPad);
  if (!PROMPT_STYLES.includes(st.prompts)) st.prompts = 'auto';
  st.rumble = typeof st.rumble === 'number' && Number.isFinite(st.rumble) ? Math.max(0, Math.min(1, st.rumble)) : 1;
  if (typeof st.nintendoLabels !== 'boolean') st.nintendoLabels = true;
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

/** keep the larger of the stored and the new value (records like the longest combo) */
export function best(p: Profile, k: string, v: number): void {
  if (v > (p.stats[k] ?? 0)) p.stats[k] = v;
}

/** the fighter played most */
export function favouriteFighter(p: Profile): string | null {
  return Object.entries(p.used).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
}

/** the move used most */
export function favouriteMove(p: Profile): string | null {
  return Object.entries(p.moves).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
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
  add(p, `m_${ctx.mode}`);
  if (ctx.mode === 'online') add(p, 'online');
  if (st.cfg.mods.length) add(p, 'modMatches');
  add(p, `mode_${st.cfg.mode}`);
  add(p, `stage_${st.cfg.stage}`);
  // what the presentation-side tracker saw (combos, moves, taunts, time), D24
  const x = matchExtra(st);
  add(p, 'time', Math.round((x?.frames ?? st.frame) / 60));
  if (x) {
    best(p, 'bestCombo', x.bestCombo);
    add(p, 'combos3', x.combos3);
    add(p, 'taunts', x.taunts);
    for (const [id, n] of Object.entries(x.moves)) p.moves[id] = (p.moves[id] ?? 0) + n;
  }
  let anyWin = false;
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
    add(p, 'taken', Math.round(f.st.taken));
    add(p, 'hits', f.st.hits);
    best(p, 'bestKOs', f.st.kos);
    best(p, 'bestDamage', Math.round(f.st.dealt));
    const won = st.winner.includes(f.i);
    if (won) {
      anyWin = true;
      add(p, 'wins');
      p.wins[id] = (p.wins[id] ?? 0) + 1;
      if (ffa && st.cfg.mode === 'stock') add(p, 'ffaWins');
      if (st.cfg.mode === 'stock' && f.st.falls === 0 && f.st.sds === 0 && !st.cfg.goal) add(p, 'flawless');
      if (st.cfg.teams && ctx.mode !== 'story' && ctx.mode !== 'classic') add(p, 'teamWins');
    }
    p.recent.unshift({ at: Date.now(), mode: ctx.mode, result: won ? 'win' : 'loss', fighter: id, kos: f.st.kos });
  }
  if (anyWin) add(p, `w_${ctx.mode}`);
  p.recent = p.recent.slice(0, 12);
}
