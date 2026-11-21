// PLACEHOLDER for Professor Hoot: borrows Kit Cadet's moves until the real fighter is written (see docs/FIGHTER_GUIDE.md).
import type { FighterDef } from '../../sim/types';
import { kit } from './kit';

export const hoot: FighterDef = {
  ...kit,
  id: 'hoot',
  name: 'Professor Hoot',
  title: 'Professor of Advanced Bro-mantics',
  role: 'Zoner',
  color: '#8a55ff',
  weight: 88,
  moveNames: { ...kit.moveNames },
};
