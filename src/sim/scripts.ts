// Registry of deterministic hooks for special behaviour. Fighter data files register their own scripts:
//   '<id>:<name>'   a move script (MoveDef.script) or passive (FighterDef.passive), called every frame
//   '<id>:mult'     attacker multiplier hook: (st, f, null, out{dmg,kb,fx}) — runs on each of the fighter's hits
//   '<id>:onhit'    after one of the fighter's hitboxes lands: (st, f, move, target)
// Kept free of imports so data files can register at load time.
import type { Fighter, MoveDef, State } from './types';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type ScriptFn = (st: State, f: Fighter, m: MoveDef | null, extra?: any) => void;

export const SCRIPTS: Record<string, ScriptFn> = {};

export function registerScripts(s: Record<string, ScriptFn>): void {
  Object.assign(SCRIPTS, s);
}
