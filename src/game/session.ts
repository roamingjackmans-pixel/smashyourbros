// Who is playing and their save: an account on Shoallhell's server (shared accounts) or this browser (offline).
import { api, setToken, type User } from '../net/api';
import { Net } from '../net/socket';
import { resetKeymaps, setControlSettings, setCustomKeys, type Action } from './input';
import { setNintendoLabels, setRumbleStrength } from './pads';
import { fixProfile, newProfile, type Profile } from './profile';

export interface Session {
  user: User | null;
  online: boolean;
  profile: Profile;
  rev: number;
}

const slot = new URLSearchParams(location.search).get('slot');
const OFFLINE_KEY = `syb.offline${slot ? `.${slot}` : ''}`;

export const session: Session = { user: null, online: false, profile: newProfile(), rev: 0 };

/** push the profile's control settings into the input modules (after sign-in and after the settings change) */
export function applySettings(): void {
  const s = session.profile.settings;
  resetKeymaps();
  s.keys.forEach((k, i) => setCustomKeys(i, k as Partial<Record<Action, string[]>>));
  setControlSettings(s.pads, s.tapJumpKb);
  setRumbleStrength(s.rumble);
  setNintendoLabels(s.nintendoLabels);
}

export function startOnline(user: User, profile: unknown, rev: number, token?: string): void {
  if (token) setToken(token);
  session.user = user;
  session.online = true;
  session.profile = fixProfile(profile as Profile);
  session.rev = rev;
  applySettings();
}

export function startOffline(): void {
  session.user = null;
  session.online = false;
  let p: Profile | null = null;
  try {
    p = JSON.parse(localStorage.getItem(OFFLINE_KEY) || 'null');
  } catch {
    /* none */
  }
  session.profile = fixProfile(p);
  session.rev = 0;
  applySettings();
}

let saveTimer = 0;
let saving = false;

/** save soon (debounced) */
export function save(): void {
  clearTimeout(saveTimer);
  saveTimer = window.setTimeout(() => void saveNow(), 600);
}

export async function saveNow(): Promise<void> {
  if (!session.online) {
    try {
      localStorage.setItem(OFFLINE_KEY, JSON.stringify(session.profile));
    } catch {
      /* private window */
    }
    return;
  }
  if (saving) {
    save();
    return;
  }
  saving = true;
  try {
    const r = await api.save(session.profile, session.rev);
    session.rev = r.rev;
  } catch (e) {
    const err = e as { status?: number; body?: { rev?: number } };
    if (err.status === 409 && typeof err.body?.rev === 'number') {
      // another tab saved: keep ours (it has this session's progress) on top of their revision
      session.rev = err.body.rev;
      saving = false;
      return saveNow();
    }
    // offline for a moment: keep a local copy too
    try {
      localStorage.setItem(`${OFFLINE_KEY}.backup`, JSON.stringify(session.profile));
    } catch {
      /* ignore */
    }
  } finally {
    saving = false;
  }
}

export async function signOut(): Promise<void> {
  try {
    await api.logout();
  } catch {
    /* already gone */
  }
  setToken('');
  await Net.drop();
  session.user = null;
  session.online = false;
}
