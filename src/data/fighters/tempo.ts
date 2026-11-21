// PLACEHOLDER for Tempo: borrows Kit Cadet's moves until the real fighter is written (see docs/FIGHTER_GUIDE.md).
import type { FighterDef } from '../../sim/types';
import { kit } from './kit';

export const tempo: FighterDef = {
  ...kit,
  id: 'tempo',
  name: 'Tempo',
  title: 'Bros Per Minute',
  role: 'Rhythm power',
  color: '#3affd5',
  weight: 94,
  moveNames: { ...kit.moveNames },
};
