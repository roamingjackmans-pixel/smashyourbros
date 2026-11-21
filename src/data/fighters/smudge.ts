// PLACEHOLDER for Smudge: borrows Kit Cadet's moves until the real fighter is written (see docs/FIGHTER_GUIDE.md).
import type { FighterDef } from '../../sim/types';
import { kit } from './kit';

export const smudge: FighterDef = {
  ...kit,
  id: 'smudge',
  name: 'Smudge',
  title: 'Painted 300 Portraits Of Their Bros',
  role: 'Paints the stage',
  color: '#ff4fd2',
  weight: 92,
  moveNames: { ...kit.moveNames },
};
