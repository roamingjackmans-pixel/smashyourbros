// PLACEHOLDER for Coral: borrows Kit Cadet's moves until the real fighter is written (see docs/FIGHTER_GUIDE.md).
import type { FighterDef } from '../../sim/types';
import { kit } from './kit';

export const coral: FighterDef = {
  ...kit,
  id: 'coral',
  name: 'Coral',
  title: 'Totally Tubular Tide-Witch',
  role: 'Whip / spacer',
  color: '#1fc0b0',
  weight: 90,
  moveNames: { ...kit.moveNames },
};
