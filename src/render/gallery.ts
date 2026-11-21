// Dev page: ?gallery=<fighterId>[&pal=0] draws every base animation and every move (at several frames, with
// hitboxes) in a grid, so art and hitboxes can be checked at a glance. ?gallery=all shows every idle pose.
import { A } from '../sim/acts';
import { fighterSkel } from '../sim/anim';
import { hitCircle, hurtCapsules } from '../sim/combat';
import { FIGHTER_INDEX, FIGHTERS } from '../sim/data';
import { initState } from '../sim/sim';
import type { Fighter, MatchCfg, State } from '../sim/types';
import { circle } from './art';
import { drawFighter } from './fighterDraw';

function cfg(id: string): MatchCfg {
  return {
    seed: 1,
    stage: 'studio',
    mode: 'stock',
    stocks: 3,
    time: 0,
    hp: 150,
    items: 0,
    ult: 'meter',
    mods: [],
    teams: false,
    friendlyFire: false,
    players: [{ fighter: id, color: 0, team: 0, cpu: 0, name: 'x', tapJump: false }],
  };
}

interface Cell {
  label: string;
  set: (f: Fighter) => void;
  boxes: boolean;
}

export function gallery(canvas: HTMLCanvasElement, id: string, pal: number, cell = 200): void {
  const c = canvas.getContext('2d')!;
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  const ids = id === 'all' ? FIGHTERS.map((f) => f.def.id) : [id];
  const cells: { id: string; cell: Cell }[] = [];
  for (const fid of ids) {
    const cf = FIGHTERS[FIGHTER_INDEX[fid]];
    if (!cf) continue;
    if (id === 'all') {
      cells.push({ id: fid, cell: { label: cf.def.name, set: (f) => ((f.act = A.IDLE), (f.af = 10)), boxes: false } });
      continue;
    }
    const base: [string, number, number, boolean?][] = [
      ['idle', A.IDLE, 10],
      ['walk', A.WALK, 12],
      ['run', A.RUN, 9],
      ['dash', A.DASH, 4],
      ['crouch', A.CROUCH, 4],
      ['jump', A.AIR, 3],
      ['fall', A.AIR, 30],
      ['double jump', A.AIR, 7],
      ['shield', A.SHIELD, 3],
      ['roll', A.ROLL, 10],
      ['airdodge', A.ADODGE, 6],
      ['hurt', A.HITSTUN, 2],
      ['tumble', A.HITSTUN, 9, true],
      ['lying', A.DOWN, 30],
      ['ledge', A.LEDGE, 10],
      ['helpless', A.HELPLESS, 4],
      ['grabbed', A.GRABBED, 4],
      ['hold', A.HOLD, 4],
      ['taunt', A.TAUNT, 18],
      ['dizzy', A.DIZZY, 10],
    ];
    for (const [label, act, af, tumble] of base) {
      cells.push({
        id: fid,
        cell: {
          label,
          boxes: false,
          set: (f) => {
            f.act = act;
            f.af = af;
            f.tumble = !!tumble;
            f.vy = label === 'jump' ? -10 : 2;
            f.jumpKind = label === 'double jump' ? 2 : 1;
            f.gnd = act === A.AIR || act === A.HITSTUN || act === A.LEDGE || act === A.HELPLESS || act === A.ADODGE || act === A.GRABBED ? -1 : 0;
          },
        },
      });
    }
    for (const mid of cf.moveIds) {
      if (mid.startsWith('item')) continue;
      const m = cf.moves[cf.moveIdx[mid]];
      const act = m.hits?.filter((h) => !h.grab);
      const first = act?.length ? Math.min(...act.map((h) => h.f[0])) : m.hits?.length ? m.hits[0].f[0] : Math.ceil(m.frames / 3);
      const frames = [Math.max(1, first - 3), first, Math.min(m.frames, first + 6)];
      for (const fr of frames) {
        cells.push({
          id: fid,
          cell: {
            label: `${mid} f${fr}/${m.frames}`,
            boxes: true,
            set: (f) => {
              f.act = A.MOVE;
              f.mv = cf.moveIdx[mid];
              f.mf = fr;
              f.gnd = m.air ? -1 : 0;
            },
          },
        });
      }
    }
  }
  const draw = (): void => {
    const w = window.innerWidth;
    const cols = Math.max(2, Math.floor(w / (cell * 0.95)));
    const cw = w / cols;
    const ch = cell;
    const rows = Math.ceil(cells.length / cols);
    canvas.style.height = `${rows * ch}px`;
    canvas.style.position = 'absolute';
    document.body.style.overflow = 'auto';
    canvas.width = w * dpr;
    canvas.height = rows * ch * dpr;
    c.setTransform(dpr, 0, 0, dpr, 0, 0);
    c.fillStyle = '#21102e';
    c.fillRect(0, 0, w, rows * ch);
    cells.forEach(({ id: fid, cell }, i) => {
      const st: State = initState(cfg(fid));
      const f = st.fighters[0];
      f.x = 0;
      f.y = 0;
      f.facing = 1;
      cell.set(f);
      const cx = (i % cols) * cw;
      const cy = Math.floor(i / cols) * ch;
      c.save();
      c.beginPath();
      c.rect(cx, cy, cw, ch);
      c.clip();
      c.fillStyle = i % 2 ? '#2b1640' : '#27133a';
      c.fillRect(cx, cy, cw, ch);
      c.strokeStyle = 'rgba(255,255,255,0.15)';
      c.beginPath();
      c.moveTo(cx, cy + ch - 34);
      c.lineTo(cx + cw, cy + ch - 34);
      c.stroke();
      c.translate(cx + cw / 2, cy + ch - 34);
      const sc = ((ch - 50) / FIGHTERS[f.def].height) * 0.75;
      c.scale(sc, sc);
      const k = fighterSkel(st, f, FIGHTERS[f.def]);
      drawFighter(c, st, f, { palette: pal, tint: '#fff', still: true, skel: k }, 0);
      if (cell.boxes) {
        c.globalAlpha = 0.35;
        for (const cap of hurtCapsules(k, FIGHTERS[f.def])) {
          c.strokeStyle = '#ffe14f';
          c.lineWidth = cap[4] * 2;
          c.lineCap = 'round';
          c.beginPath();
          c.moveTo(cap[0], cap[1]);
          c.lineTo(cap[2], cap[3]);
          c.stroke();
        }
        c.globalAlpha = 1;
        const m = FIGHTERS[f.def].moves[f.mv];
        for (const h of m.hits ?? []) {
          if (f.mf < h.f[0] || f.mf > h.f[1]) continue;
          const [x, y, r] = hitCircle(k, h);
          circle(c, x, y, r, h.grab ? 'rgba(170,90,255,0.45)' : 'rgba(255,40,40,0.45)', '#ff2020', 2);
        }
      }
      c.restore();
      c.fillStyle = '#fff';
      c.font = '700 12px Nunito, sans-serif';
      c.fillText(cell.label, cx + 6, cy + ch - 14);
    });
  };
  draw();
  window.addEventListener('resize', draw);
}
