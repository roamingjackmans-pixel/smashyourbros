// Boot: styles, input, audio unlock, then either a dev quick match (?quick) or the app (sign-in, menus).
import './ui/theme.css';
import { audio } from './audio/audio';
import { attachKeyboard, type Device } from './game/input';
import { localMatch } from './game/match';
import { fpsWanted, startOverlay } from './game/perf';
import { onPadChange, padNumber, pollPads } from './game/pads';
import { reconnectSteamControllers, watchSteamDisconnects } from './game/steamController';
import { PLAYER_TINTS } from './render/renderer';
import { FIGHTER_INDEX, ROSTER } from './sim/data';
import type { MatchCfg } from './sim/types';
import { toast } from './ui/dom';
import { refreshGlyphs } from './ui/glyphs';
import { attachMenuKeys, pollMenuPad } from './ui/menuPad';
import './ui/controls.css';

attachKeyboard();
attachMenuKeys();
if (fpsWanted()) startOverlay();

// the input loop (D23): registered first, so every frame reads the pads before a match or a menu needs them
const inputLoop = (now: number): void => {
  requestAnimationFrame(inputLoop);
  pollPads();
  pollMenuPad(now);
  refreshGlyphs(now);
};
requestAnimationFrame(inputLoop);
onPadChange((p, on) => {
  if (on) toast(`🎮 ${p.model} connected (pad ${padNumber(p.index)})`, 'ok', 2600);
  else toast(`🎮 ${p.model} disconnected`, 'bad', 3200);
  if (on) audio.sfx('select');
});
watchSteamDisconnects();
void reconnectSteamControllers();
const unlock = (): void => audio.unlock();
window.addEventListener('pointerdown', unlock);
window.addEventListener('keydown', unlock);

const canvas = document.getElementById('game') as HTMLCanvasElement;
const params = new URLSearchParams(location.search);

function quick(): void {
  const ids = ROSTER.map((f) => f.def.id);
  const pick = (k: string, d: string): string => {
    const v = params.get(k);
    return v && FIGHTER_INDEX[v] !== undefined ? v : d;
  };
  const n = Math.max(2, Math.min(4, Number(params.get('n') || 2)));
  const players = Array.from({ length: n }, (_, i) => ({
    fighter: pick(`p${i + 1}`, ids[i % ids.length]),
    color: i,
    team: i,
    cpu: i === 0 ? Number(params.get('cpu1') || 0) : Number(params.get(`cpu${i + 1}`) || 5),
    name: i === 0 ? 'You' : `CPU ${i}`,
    tapJump: false,
  }));
  const cfg: MatchCfg = {
    seed: Math.floor(Math.random() * 1e9),
    stage: params.get('stage') || 'studio',
    mode: (params.get('mode') as MatchCfg['mode']) || 'stock',
    stocks: Number(params.get('stocks') || 3),
    time: Number(params.get('time') || 0),
    hp: 150,
    items: Number(params.get('items') ?? 2),
    ult: (params.get('ult') as MatchCfg['ult']) || 'meter',
    mods: (params.get('mods') || '').split(',').filter(Boolean),
    teams: false,
    friendlyFire: false,
    practice: params.has('practice'),
    players,
  };
  const devices: (Device | null)[] = players.map((p, i) => (p.cpu ? null : { kind: i === 0 ? 'kb' : 'pad', index: i === 0 ? 0 : i - 1, tapJump: false }));
  const m = localMatch(
    canvas,
    cfg,
    devices,
    { names: players.map((p) => p.name), tints: PLAYER_TINTS, palettes: players.map((_, i) => i), local: players.map((p) => !p.cpu), boxes: params.has('boxes') },
    { onEnd: () => location.reload() },
  );
  m.start();
  (window as unknown as { syb: unknown }).syb = m;
}

if (params.has('gallery')) import('./render/gallery').then((g) => g.gallery(canvas, params.get('gallery') || 'kit', Number(params.get('pal') || 0), Number(params.get('cell') || 200)));
else if (params.has('quick')) quick();
else import('./app').then((a) => a.boot(canvas));
