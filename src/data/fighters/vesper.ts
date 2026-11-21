// PLACEHOLDER for Vesper: borrows Kit Cadet's moves until the real fighter is written (see docs/FIGHTER_GUIDE.md).
import type { FighterDef } from '../../sim/types';
import { kit } from './kit';

export const vesper: FighterDef = {
  ...kit,
  id: 'vesper',
  name: 'Vesper',
  title: 'Too Cool (Secretly Writes Poems About You)',
  role: 'Ninja',
  color: '#3a3346',
  weight: 80,
  moveNames: { ...kit.moveNames },
};
