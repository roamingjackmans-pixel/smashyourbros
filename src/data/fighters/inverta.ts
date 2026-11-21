// PLACEHOLDER for Inverta: borrows Kit Cadet's moves until the real fighter is written (see docs/FIGHTER_GUIDE.md).
import type { FighterDef } from '../../sim/types';
import { kit } from './kit';

export const inverta: FighterDef = {
  ...kit,
  id: 'inverta',
  name: 'Inverta',
  title: 'You Turn My World Upside Down',
  role: 'Gravity flip',
  color: '#9b7bff',
  weight: 84,
  moveNames: { ...kit.moveNames },
};
