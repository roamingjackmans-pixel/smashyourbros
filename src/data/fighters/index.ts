// Every fighter definition, in roster order. Hidden ones (story enemies, bosses) come last.
import type { FighterDef } from '../../sim/types';
import { kit } from './kit';
import { clank } from './clank';
import { granny } from './granny';
import { zippy } from './zippy';
import { hoot } from './hoot';
import { bouldar } from './bouldar';
import { vesper } from './vesper';
import { chef } from './chef';
import { coral } from './coral';
import { nimbus } from './nimbus';
import { amp } from './amp';
import { ruby } from './ruby';
import { echo } from './echo';
import { inverta } from './inverta';
import { smudge } from './smudge';
import { tempo } from './tempo';
import { stagehand } from './stagehand';
import { max } from './max';

export const FIGHTER_DEFS: FighterDef[] = [kit, clank, granny, zippy, hoot, bouldar, vesper, chef, coral, nimbus, amp, ruby, echo, inverta, smudge, tempo, stagehand, max];
