// PLACEHOLDER for Max Ratings: borrows Kit Cadet's moves until the real fighter is written (see docs/FIGHTER_GUIDE.md).
import type { FighterDef } from '../../sim/types';
import { kit } from './kit';

export const max: FighterDef = {
  ...kit,
  id: 'max',
  name: 'Max Ratings',
  title: 'Your Host!',
  role: 'Final boss',
  color: '#ffcf3a',
  weight: 120,
  hidden: true,
  moveNames: { ...kit.moveNames },
};
