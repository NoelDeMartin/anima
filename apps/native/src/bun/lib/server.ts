import { join } from 'node:path';

import type { Subprocess } from 'bun';
import { Utils } from 'electrobun/bun';

let serverProcess: Subprocess | null = null;

export function isServerRunning(): boolean {
  return serverProcess !== null;
}

export async function openServer(): Promise<void> {
  Utils.openExternal('http://localhost:1191');
}

export async function startServer(): Promise<void> {
  serverProcess = Bun.spawn([join(import.meta.dir, '..', 'bin/backend'), 'serve'], {
    stdout: 'inherit',
    stderr: 'inherit',
  });
}

export async function stopServer(): Promise<void> {
  serverProcess?.kill();
  serverProcess = null;
}
