// The one socket a signed-in tab keeps open to Shoallhell's server (game: 'syb'): presence for friends, invites,
// the lobby room, the input relay for matches and WebRTC signalling.
import { io, type Socket } from 'socket.io-client';
import { getToken, serverBase } from './api';

export interface RoomPlayer {
  userId: string;
  name: string;
  online: boolean;
}
export interface RoomView {
  code: string;
  game?: string;
  host: string;
  hostOnline?: boolean;
  players: RoomPlayer[];
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Handler = (data: any) => void;

export class Net {
  socket: Socket;
  room: RoomView | null = null;
  me = '';
  private handlers = new Map<string, Set<Handler>>();

  private constructor(socket: Socket) {
    this.socket = socket;
    socket.on('room:update', (r: RoomView) => {
      this.room = r;
      this.emit('room', r);
    });
    socket.on('room:closed', (m: { reason: string }) => {
      this.room = null;
      this.emit('closed', m);
    });
    socket.on('host:msg', (m: unknown) => this.emit('hostmsg', m));
    socket.on('guest:msg', (m: { from: string; msg: unknown }) => this.emit('guestmsg', m));
    socket.on('guest:left', (m: { userId: string }) => this.emit('guestleft', m));
    socket.on('guest:joined', (m: { userId: string; name: string; back?: boolean }) => this.emit('guestjoined', m));
    socket.on('host:away', (m: unknown) => this.emit('hostaway', m));
    socket.on('host:back', () => this.emit('hostback', {}));
    socket.on('friends:update', () => this.emit('friends', {}));
    socket.on('friend:invite', (m: unknown) => this.emit('invite', m));
    socket.on('syb:in', (m: { from: string; d: unknown }) => this.emit('in', m));
    socket.on('rtc:signal', (m: { from: string; data: unknown }) => this.emit('signal', m));
    socket.on('disconnect', () => this.emit('disconnect', {}));
    socket.on('connect', () => this.emit('connect', {}));
  }

  private static sharedP: Promise<Net> | null = null;

  static shared(): Promise<Net> {
    Net.sharedP ??= Net.connect().catch((e) => {
      Net.sharedP = null;
      throw e;
    });
    return Net.sharedP;
  }

  static current: Net | null = null;

  static async drop(): Promise<void> {
    const p = Net.sharedP;
    Net.sharedP = null;
    Net.current = null;
    if (p) (await p.catch(() => null))?.socket.disconnect();
  }

  private static async connect(): Promise<Net> {
    const server = await serverBase();
    const socket = io(server || window.location.origin, {
      path: '/games/shoallhell/socket.io',
      auth: { token: getToken(), game: 'syb' },
      transports: ['websocket', 'polling'],
      reconnectionDelay: 600,
    });
    await new Promise<void>((resolve, reject) => {
      const t = setTimeout(() => reject(new Error('Can’t reach the online server right now.')), 12000);
      socket.once('connect', () => {
        clearTimeout(t);
        resolve();
      });
      socket.once('connect_error', (e: Error) => {
        clearTimeout(t);
        reject(new Error(e.message === 'Please sign in.' ? 'Please sign in again.' : 'Can’t reach the online server right now.'));
      });
    });
    const n = new Net(socket);
    Net.current = n;
    return n;
  }

  on(ev: string, fn: Handler): () => void {
    if (!this.handlers.has(ev)) this.handlers.set(ev, new Set());
    this.handlers.get(ev)!.add(fn);
    return () => this.handlers.get(ev)?.delete(fn);
  }

  private emit(ev: string, data: unknown): void {
    for (const fn of this.handlers.get(ev) ?? []) fn(data);
  }

  private ack<T>(ev: string, msg: unknown): Promise<T> {
    return new Promise((resolve, reject) => {
      const t = setTimeout(() => reject(new Error('The server didn’t answer.')), 10000);
      this.socket.emit(ev, msg, (r: T & { error?: string }) => {
        clearTimeout(t);
        if (r?.error) reject(Object.assign(new Error(r.error), { body: r }));
        else resolve(r);
      });
    });
  }

  async create(): Promise<RoomView> {
    const r = await this.ack<{ room: RoomView }>('host:create', { chars: [] });
    this.room = r.room;
    return r.room;
  }

  async join(code: string): Promise<RoomView> {
    const r = await this.ack<{ room: RoomView }>('room:join', { code, chars: [] });
    this.room = r.room;
    return r.room;
  }

  async reclaim(code: string): Promise<RoomView> {
    const r = await this.ack<{ room: RoomView }>('host:reclaim', { code });
    this.room = r.room;
    return r.room;
  }

  leave(): void {
    this.socket.emit('room:leave');
    this.room = null;
  }

  invite(userId: string): Promise<unknown> {
    return this.ack('friend:invite', { userId });
  }

  friendLobby(userId: string): Promise<{ code: string; game?: string }> {
    return this.ack('friend:lobby', { userId });
  }

  hostSend(msg: unknown): void {
    this.socket.emit('host:msg', msg);
  }

  guestSend(msg: unknown): void {
    this.socket.emit('guest:msg', msg);
  }

  /** input packet to everyone else in the room */
  sendInputs(d: unknown): void {
    this.socket.emit('syb:in', d);
  }

  signal(to: string, data: unknown): void {
    this.socket.emit('rtc:signal', { to, data });
  }

  get connected(): boolean {
    return this.socket.connected;
  }
}
