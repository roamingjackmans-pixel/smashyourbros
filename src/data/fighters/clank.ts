// PLACEHOLDER for Sir Clank: borrows Kit Cadet's moves until the real fighter is written (see docs/FIGHTER_GUIDE.md).
import type { FighterDef } from '../../sim/types';
import { kit } from './kit';

export const clank: FighterDef = {
  ...kit,
  id: 'clank',
  name: 'Sir Clank',
  title: 'Knight in Shining Bromance',
  role: 'Swordfighter',
  color: '#9aa3b5',
  weight: 104,
  moveNames: { ...kit.moveNames },
};
