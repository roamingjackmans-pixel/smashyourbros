// PLACEHOLDER for Zippy: borrows Kit Cadet's moves until the real fighter is written (see docs/FIGHTER_GUIDE.md).
import type { FighterDef } from '../../sim/types';
import { kit } from './kit';

export const zippy: FighterDef = {
  ...kit,
  id: 'zippy',
  name: 'Zippy',
  title: 'Special Delivery',
  role: 'Speedster',
  color: '#ffcf3a',
  weight: 74,
  moveNames: { ...kit.moveNames },
};
