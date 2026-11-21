// npm run dev: Shoallhell's server (accounts, friends, relay; port 3031) and Vite (port 5175) together.
// The server lives in the Shoallhell repo (shared accounts): SHOALLHELL_DIR overrides ../Shoallhell.
import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import path from 'node:path';

const dir = process.env.SHOALLHELL_DIR || path.resolve('..', 'Shoallhell');
const kids = [];
if (existsSync(path.join(dir, 'server', 'index.js'))) {
  kids.push(spawn(process.execPath, [path.join(dir, 'server', 'index.js')], { stdio: 'inherit', cwd: dir, env: { ...process.env, PORT: process.env.SHOALLHELL_PORT || '3031' } }));
} else console.warn(`[dev] no Shoallhell server at ${dir}: online play and accounts are off (offline play still works)`);
kids.push(spawn(process.execPath, ['node_modules/vite/bin/vite.js'], { stdio: 'inherit' }));
const stop = () => {
  for (const k of kids) k.kill();
  process.exit(0);
};
process.on('SIGINT', stop);
process.on('SIGTERM', stop);
for (const k of kids) k.on('exit', (code) => code && stop());
