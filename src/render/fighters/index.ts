// Art for every fighter, by id. A fighter without art yet gets a plain mannequin in its colour.
import { FIGHTERS } from '../../sim/data';
import { circle, ellipse, eyes, mouth, shade, type ArtDef, type Palette } from '../art';
import { kitArt } from './kit';
import { clankArt } from './clank';
import { grannyArt } from './granny';
import { zippyArt } from './zippy';
import { hootArt } from './hoot';
import { bouldarArt } from './bouldar';
import { vesperArt } from './vesper';
import { chefArt } from './chef';
import { coralArt } from './coral';
import { nimbusArt } from './nimbus';
import { ampArt } from './amp';
import { rubyArt } from './ruby';
import { echoArt } from './echo';
import { invertaArt } from './inverta';
import { smudgeArt } from './smudge';
import { tempoArt } from './tempo';
import { stagehandArt } from './stagehand';
import { maxArt } from './max';

const ALL: Record<string, ArtDef | null> = { kit: kitArt, clank: clankArt, granny: grannyArt, zippy: zippyArt, hoot: hootArt, bouldar: bouldarArt, vesper: vesperArt, chef: chefArt, coral: coralArt, nimbus: nimbusArt, amp: ampArt, ruby: rubyArt, echo: echoArt, inverta: invertaArt, smudge: smudgeArt, tempo: tempoArt, stagehand: stagehandArt, max: maxArt };
export const ARTS: Record<string, ArtDef> = {};
for (const [k, v] of Object.entries(ALL)) if (v) ARTS[k] = v;

const cache: Record<string, ArtDef> = {};

function mannequin(color: string): ArtDef {
  const pal = (main: string): Palette => ({ main, second: shade(main, 0.55), accent: shade(main, -0.4), skin: '#ffd2ad' });
  const hues = [color, '#3a7bff', '#46b85a', '#ff6fb5', '#8a55ff', '#2b2633', '#e43a3a', '#1fc0b0'];
  return {
    limb: 11,
    palettes: hues.map(pal),
    head: (c, v) => {
      const R = 19;
      circle(c, 0, 0, R, v.p.skin, v.ol, 3);
      ellipse(c, -R * 0.1, -R * 0.55, R * 0.95, R * 0.5, 0, v.p.main, v.ol, 2.6);
      eyes(c, v, R * 0.3, R * 0.05, R * 0.25, '#222');
      mouth(c, v, R * 0.4, R * 0.5, R * 0.4);
    },
  };
}

export function artFor(id: string): ArtDef {
  if (ARTS[id]) return ARTS[id];
  if (!cache[id]) {
    const def = FIGHTERS.find((f) => f.def.id === id)?.def;
    cache[id] = mannequin(def?.color ?? '#999999');
  }
  return cache[id];
}

export function registerArt(id: string, art: ArtDef): void {
  ARTS[id] = art;
}
