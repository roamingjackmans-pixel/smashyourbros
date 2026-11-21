// The four stages. Solids are rectangles (top y1, bottom y2; world y down; floor at y = 0), stacked to taper the
// underside. Soft platforms can be jumped through and dropped through. Paths move things deterministically.
import type { StageDef } from '../../sim/types';

const studio: StageDef = {
  id: 'studio',
  name: 'Studio 9 Main Stage',
  blurb: 'Where it all happens. Three platforms, nine billion viewers, one smug host.',
  blast: { l: -2150, r: 2150, t: -1750, b: 1150 },
  cam: { l: -1500, r: 1500, t: -1150, b: 650 },
  solids: [
    { x1: -640, y1: 0, x2: 640, y2: 64, ledgeL: true, ledgeR: true },
    { x1: -560, y1: 64, x2: 560, y2: 150, kind: 'under' },
    { x1: -420, y1: 150, x2: 420, y2: 240, kind: 'under' },
  ],
  plats: [
    { x1: -470, x2: -210, y: -175 },
    { x1: 210, x2: 470, y: -175 },
    { x1: -130, x2: 130, y: -345 },
  ],
  spawns: [
    [-420, -40],
    [420, -40],
    [-160, -40],
    [160, -40],
  ],
  respawn: [0, -620],
  music: 'studio',
  bg: 'studio',
  hazard: 'light',
};

const rooftops: StageDef = {
  id: 'rooftops',
  name: 'Neon Rooftops',
  blurb: 'A rooftop above Volume City at midnight. One long roof, one very confused billboard drone.',
  blast: { l: -2250, r: 2250, t: -1800, b: 1250 },
  cam: { l: -1600, r: 1600, t: -1200, b: 700 },
  solids: [
    { x1: -760, y1: 0, x2: 760, y2: 56, ledgeL: true, ledgeR: true },
    { x1: -700, y1: 56, x2: 700, y2: 1400, kind: 'building' },
  ],
  plats: [
    { x1: -170, x2: 170, y: -235, path: { ax: 430, period: 640 }, kind: 'drone' },
    { x1: -640, x2: -470, y: -120, kind: 'ac' },
    { x1: 470, x2: 640, y: -120, kind: 'ac' },
  ],
  spawns: [
    [-480, -40],
    [480, -40],
    [-200, -40],
    [200, -40],
  ],
  respawn: [0, -640],
  music: 'rooftops',
  bg: 'rooftops',
  hazard: 'sign',
};

const ship = { ay: 14, period: 260 };
const galleon: StageDef = {
  id: 'galleon',
  name: 'Galleon Cove',
  blurb: 'The romance episode, filmed on a pirate ship. It bobs. Bring your sea legs, bro.',
  blast: { l: -2150, r: 2150, t: -1800, b: 1150 },
  cam: { l: -1500, r: 1500, t: -1200, b: 600 },
  solids: [
    { x1: -700, y1: 0, x2: 700, y2: 70, ledgeL: true, ledgeR: true, path: ship },
    { x1: -610, y1: 70, x2: 610, y2: 170, path: ship, kind: 'hull' },
    { x1: -480, y1: 170, x2: 480, y2: 250, path: ship, kind: 'hull' },
  ],
  plats: [
    { x1: -580, x2: -370, y: -195, path: ship, kind: 'rigging' },
    { x1: 370, x2: 580, y: -195, path: ship, kind: 'rigging' },
    { x1: -115, x2: 115, y: -390, path: ship, kind: 'nest' },
  ],
  spawns: [
    [-460, -40],
    [460, -40],
    [-180, -40],
    [180, -40],
  ],
  respawn: [0, -660],
  music: 'galleon',
  bg: 'galleon',
  hazard: 'cannon',
};

const orbit: StageDef = {
  id: 'orbit',
  name: 'Orbit Station',
  blurb: 'A space station above a candy-coloured planet. Solar panels drift. So do your bros.',
  blast: { l: -2050, r: 2050, t: -1900, b: 1300 },
  cam: { l: -1450, r: 1450, t: -1250, b: 700 },
  solids: [
    { x1: -470, y1: 0, x2: 470, y2: 60, ledgeL: true, ledgeR: true },
    { x1: -390, y1: 60, x2: 390, y2: 150, kind: 'under' },
    { x1: -250, y1: 150, x2: 250, y2: 230, kind: 'under' },
  ],
  plats: [
    { x1: -760, x2: -560, y: -110, path: { ay: 120, period: 420 }, kind: 'panel' },
    { x1: 560, x2: 760, y: -110, path: { ay: 120, period: 420, phase: 210 }, kind: 'panel' },
    { x1: -150, x2: 150, y: -310, path: { ax: 280, period: 760 }, kind: 'dock' },
  ],
  spawns: [
    [-330, -40],
    [330, -40],
    [-110, -40],
    [110, -40],
  ],
  respawn: [0, -640],
  music: 'orbit',
  bg: 'orbit',
  hazard: 'debris',
};

export const STAGE_DEFS: StageDef[] = [studio, rooftops, galleon, orbit];
