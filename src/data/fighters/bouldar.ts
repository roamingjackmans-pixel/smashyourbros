// PLACEHOLDER for Bouldar: borrows Kit Cadet's moves until the real fighter is written (see docs/FIGHTER_GUIDE.md).
import type { FighterDef } from '../../sim/types';
import { kit } from './kit';

export const bouldar: FighterDef = {
  ...kit,
  id: 'bouldar',
  name: 'Bouldar',
  title: 'Rock Solid',
  role: 'Super heavy',
  color: '#a8896a',
  weight: 135,
  moveNames: { ...kit.moveNames },
};
