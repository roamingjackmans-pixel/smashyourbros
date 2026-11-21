// PLACEHOLDER for Granny Grapple: borrows Kit Cadet's moves until the real fighter is written (see docs/FIGHTER_GUIDE.md).
import type { FighterDef } from '../../sim/types';
import { kit } from './kit';

export const granny: FighterDef = {
  ...kit,
  id: 'granny',
  name: 'Granny Grapple',
  title: 'Bro-ma',
  role: 'Grappler',
  color: '#ff6fb5',
  weight: 118,
  moveNames: { ...kit.moveNames },
};
