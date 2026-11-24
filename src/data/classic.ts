// Classic: eight rounds per fighter, then the host. Intensity 1-9 sets the CPU levels.
import { ROSTER } from '../sim/data';

export interface ClassicRound {
  title: string;
  blurb: string;
  stage: string;
  foes: { fighter: string; giant?: boolean; ally?: boolean; boss?: boolean }[];
  stocks: number;
  mods?: string[];
}

function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
}

/** the ladder for a fighter; `seed` (FlashGames: the day's seed) replaces the fighter's own hash for foes and stages */
export function classicRounds(fighter: string, seed?: number): ClassicRound[] {
  const others = ROSTER.map((r) => r.def.id).filter((id) => id !== fighter);
  const base = seed === undefined ? hash(fighter) : seed >>> 0;
  let s = base;
  const pick = (): string => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    const i = s % others.length;
    return others.splice(i, 1)[0] ?? 'kit';
  };
  const stages = ['studio', 'rooftops', 'galleon', 'orbit'];
  const st = (i: number): string => stages[(base + i) % stages.length];
  return [
    { title: 'Round 1: Opening Act', blurb: 'One-on-one. Show the people what you’ve got.', stage: st(0), foes: [{ fighter: pick() }], stocks: 2 },
    { title: 'Round 2: Rivals', blurb: 'Another bro, another beatdown.', stage: st(1), foes: [{ fighter: pick() }], stocks: 2 },
    { title: 'Round 3: Tag Team', blurb: 'You get a partner. They get a partner. Feelings get hurt.', stage: st(2), foes: [{ fighter: pick(), ally: true }, { fighter: pick() }, { fighter: pick() }], stocks: 2 },
    { title: 'Round 4: Big Bro', blurb: 'They drank the sponsor’s protein shake.', stage: st(3), foes: [{ fighter: pick(), giant: true }], stocks: 2 },
    { title: 'Round 5: Free-For-All', blurb: 'Three bros, one you.', stage: st(0), foes: [{ fighter: pick() }, { fighter: pick() }, { fighter: pick() }], stocks: 2, mods: [] },
    { title: 'Round 6: Mirror Match', blurb: 'Your toughest rival: you. Looking good, by the way.', stage: st(1), foes: [{ fighter }], stocks: 2 },
    { title: 'Round 7: Audience Choice', blurb: 'The crowd picks the rules. The crowd is chaotic.', stage: st(2), foes: [{ fighter: pick() }, { fighter: pick() }], stocks: 2, mods: ['audience'] },
    { title: 'Final Round: Max Ratings', blurb: 'The host himself. Then the camera.', stage: 'studio', foes: [{ fighter: 'max', boss: true }], stocks: 3 },
  ];
}

export const INTENSITY_NAMES = ['', 'Casual Bro', 'Gym Bro', 'Bro-fessional', 'Swole Bro', 'Bro Supreme', 'Ultra Bro', 'Mega Bro', 'Bro-mageddon', 'Bro-pocalypse'];
