// PLACEHOLDER for Chef Flambé: borrows Kit Cadet's moves until the real fighter is written (see docs/FIGHTER_GUIDE.md).
import type { FighterDef } from '../../sim/types';
import { kit } from './kit';

export const chef: FighterDef = {
  ...kit,
  id: 'chef',
  name: 'Chef Flambé',
  title: 'Your Plate Is Never Empty',
  role: 'Trickster',
  color: '#f4f1ea',
  weight: 100,
  moveNames: { ...kit.moveNames },
};
