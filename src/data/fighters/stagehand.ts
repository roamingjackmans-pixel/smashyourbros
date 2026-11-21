// PLACEHOLDER for Stagehand Bot: borrows Kit Cadet's moves until the real fighter is written (see docs/FIGHTER_GUIDE.md).
import type { FighterDef } from '../../sim/types';
import { kit } from './kit';

export const stagehand: FighterDef = {
  ...kit,
  id: 'stagehand',
  name: 'Stagehand Bot',
  title: 'Crew Member of the Week',
  role: 'Story grunt',
  color: '#9aa3b5',
  weight: 80,
  hidden: true,
  moveNames: { ...kit.moveNames },
};
