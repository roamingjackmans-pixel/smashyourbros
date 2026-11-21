// PLACEHOLDER for Amp: borrows Kit Cadet's moves until the real fighter is written (see docs/FIGHTER_GUIDE.md).
import type { FighterDef } from '../../sim/types';
import { kit } from './kit';

export const amp: FighterDef = {
  ...kit,
  id: 'amp',
  name: 'Amp',
  title: 'This Song’s About My Bro',
  role: 'Rockstar bruiser',
  color: '#e43a3a',
  weight: 102,
  moveNames: { ...kit.moveNames },
};
