// PLACEHOLDER for Nimbus: borrows Kit Cadet's moves until the real fighter is written (see docs/FIGHTER_GUIDE.md).
import type { FighterDef } from '../../sim/types';
import { kit } from './kit';

export const nimbus: FighterDef = {
  ...kit,
  id: 'nimbus',
  name: 'Nimbus',
  title: 'Cries When Bros Hug (It’s Rain)',
  role: 'Floaty multi-jumper',
  color: '#bfe9ff',
  weight: 66,
  moveNames: { ...kit.moveNames },
};
