import { homedir } from 'node:os';
import { join } from 'node:path';

import { isDevelopment } from '@noeldemartin/utils';

import { env } from './env';

export const PORT = 1191;
export const FRONTEND_URL = 'http://localhost:5173';
export const BACKEND_URL = `http://localhost:${PORT}`;
export const CLIENT_ID = `${BACKEND_URL}/clientid.jsonld`;
export const POD_URL = `${BACKEND_URL}/pod/`;
export const ROOT_STORAGE = join(homedir(), isDevelopment() ? '.anima-dev' : '.anima');
export const FRONTEND_ASSETS = join(import.meta.dirname, 'public');

export function frontendUrl(path: string = '/'): string {
  return new URL(path, env('SERVE_FRONTEND') ? BACKEND_URL : FRONTEND_URL).href;
}
