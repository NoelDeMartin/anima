import { homedir } from 'node:os';
import { join } from 'node:path';

export const PORT = 1191;
export const FRONTEND_URL = 'http://localhost:5173';
export const BACKEND_URL = `http://localhost:${PORT}`;
export const CLIENT_ID = `${BACKEND_URL}/clientid.jsonld`;
export const ROOT_STORAGE = join(homedir(), '.anima');
