// End to end through the real server: Shoallhell's server (shared accounts) runs on a spare port, two accounts
// join a Smash Your Bros lobby, and two rollback sessions play a match over the server relay. Both must agree.
import { spawn, type ChildProcess } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { io, type Socket } from 'socket.io-client';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { Session, type Packet } from '../src/net/rollback';
import { B_ATTACK, B_JUMP, pack } from '../src/sim/input';
import { checksum, initState } from '../src/sim/sim';
import type { MatchCfg } from '../src/sim/types';

const SERVER_DIR = process.env.SHOALLHELL_DIR || path.resolve(__dirname, '..', '..', 'Shoallhell');
const HAVE_SERVER = fs.existsSync(path.join(SERVER_DIR, 'server', 'index.js'));
const PORT = 3950 + Math.floor(Math.random() * 40);
const BASE = `http://localhost:${PORT}/games/shoallhell`;
let proc: ChildProcess | null = null;
let dir = '';

async function post(p: string, body: unknown): Promise<Record<string, any>> {
  const r = await fetch(`${BASE}/api${p}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  return r.json();
}

function connect(token: string): Promise<Socket> {
  return new Promise((resolve, reject) => {
    const s = io(`http://localhost:${PORT}`, { path: '/games/shoallhell/socket.io', auth: { token, game: 'syb' }, transports: ['websocket'] });
    s.once('connect', () => resolve(s));
    s.once('connect_error', reject);
  });
}

beforeAll(async () => {
  if (!HAVE_SERVER) return;
  dir = fs.mkdtempSync(path.join(os.tmpdir(), 'syb-online-'));
  proc = spawn(process.execPath, [path.join(SERVER_DIR, 'server', 'index.js')], { cwd: SERVER_DIR, env: { ...process.env, PORT: String(PORT), DATA_DIR: dir }, stdio: 'ignore' });
  for (let i = 0; i < 60; i++) {
    try {
      if ((await fetch(`${BASE}/api/ping`)).ok) return;
    } catch {
      /* starting */
    }
    await new Promise((r) => setTimeout(r, 100));
  }
  throw new Error('server did not start');
}, 20000);

afterAll(() => {
  proc?.kill();
  try {
    if (dir) fs.rmSync(dir, { recursive: true, force: true });
  } catch {
    /* temp */
  }
});

describe.skipIf(!HAVE_SERVER)('online through the server relay', () => {
  it('two accounts play a synced rollback match in a Smash Your Bros lobby', async () => {
    const a = await post('/signup', { email: 'bro1@example.test', password: 'bropass123', name: 'Bro One' });
    const b = await post('/signup', { email: 'bro2@example.test', password: 'bropass123', name: 'Bro Two' });
    const sa = await connect(a.token);
    const sb = await connect(b.token);
    const room = await new Promise<{ code: string }>((res) => sa.emit('host:create', { chars: [] }, (r: { room: { code: string } }) => res(r.room)));
    const joined = await new Promise<{ ok?: boolean }>((res) => sb.emit('room:join', { code: room.code, chars: [] }, res));
    expect(joined.ok).toBe(true);

    const cfg: MatchCfg = {
      seed: 4242,
      stage: 'rooftops',
      mode: 'stock',
      stocks: 3,
      time: 0,
      hp: 150,
      items: 2,
      ult: 'meter',
      mods: [],
      teams: false,
      friendlyFire: false,
      players: [0, 1, 2].map((i) => ({ fighter: 'kit', color: i, team: i, cpu: i === 2 ? 6 : 0, name: `P${i}`, tapJump: false })),
    };
    const s0 = new Session(initState(structuredClone(cfg)), 0, [1], 2);
    const s1 = new Session(initState(structuredClone(cfg)), 1, [0], 2);
    sa.on('syb:in', (m: { d: Packet }) => s0.receive(m.d));
    sb.on('syb:in', (m: { d: Packet }) => s1.receive(m.d));
    const input = (slot: number, fr: number): number => pack(Math.round(Math.sin(fr * 0.07 + slot * 2) * 100), fr % 90 < 8 ? 100 : 0, (fr + slot) % 19 === 0 ? B_ATTACK : (fr + slot * 5) % 47 === 0 ? B_JUMP : 0, 0);
    const FRAMES = 420;
    for (let t = 0; t < FRAMES + 60; t++) {
      for (const [s, sock] of [
        [s0, sa],
        [s1, sb],
      ] as const) {
        s.addLocal(t < FRAMES ? input(s.local, s.frame) : 0);
        sock.emit('syb:in', s.packet(Math.max(0, s.frame - 16)));
        s.advance();
      }
      await new Promise((r) => setTimeout(r, 3));
    }
    // let the last packets land
    await new Promise((r) => setTimeout(r, 300));
    s0.advance();
    s1.advance();
    const target = Math.min(s0.minConfirmed(), s1.minConfirmed()) - 4;
    const h0 = s0.snapshot(target);
    const h1 = s1.snapshot(target);
    expect(h0 && h1).toBeTruthy();
    expect(checksum(h0!)).toBe(checksum(h1!));
    expect(target).toBeGreaterThan(300);
    sa.disconnect();
    sb.disconnect();
  }, 30000);
});
