// PLACEHOLDER for Echo: borrows Kit Cadet's moves until the real fighter is written (see docs/FIGHTER_GUIDE.md).
import type { FighterDef } from '../../sim/types';
import { kit } from './kit';

export const echo: FighterDef = {
  ...kit,
  id: 'echo',
  name: 'Echo',
  title: 'I’ve Lived This Moment 40 Times',
  role: 'Time rewind',
  color: '#9cffd9',
  weight: 86,
  moveNames: { ...kit.moveNames },
};
