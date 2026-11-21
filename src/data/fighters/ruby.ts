// PLACEHOLDER for Rumble Ruby: borrows Kit Cadet's moves until the real fighter is written (see docs/FIGHTER_GUIDE.md).
import type { FighterDef } from '../../sim/types';
import { kit } from './kit';

export const ruby: FighterDef = {
  ...kit,
  id: 'ruby',
  name: 'Rumble Ruby',
  title: 'Pouch Has Room For One Bro',
  role: 'Combo boxer',
  color: '#ff8a5a',
  weight: 96,
  moveNames: { ...kit.moveNames },
};
