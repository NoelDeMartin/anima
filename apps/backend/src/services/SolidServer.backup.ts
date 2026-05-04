import { existsSync, unlinkSync } from 'node:fs';
import { join } from 'node:path';

import { facade } from '@noeldemartin/utils';
import { AppRunner } from '@solid/community-server';
import { status } from 'elysia';

import { BACKEND_URL, ROOT_STORAGE } from '../lib/constants';
import { env } from '../lib/env';

const CSS_SOCKET = join(ROOT_STORAGE, '.community-solid-server.sock');
const GUARDED_PATHS = ['/idp/register/', '/pod/create/'];

// TODO implement calling node's shellExec command or something, forget about doing it programmatically for now
export class SolidServerService {
  public async start(): Promise<void> {
    const runner = new AppRunner();

    if (existsSync(CSS_SOCKET)) {
      unlinkSync(CSS_SOCKET);
    }

    const app = await runner.create({
      config: '@css:config/file.json',
      shorthand: {
        port: CSS_SOCKET,
        baseUrl: BACKEND_URL,
        rootFilePath: join(ROOT_STORAGE, 'pods'),
        loggingLevel: 'info',
        showStackTrace: false,
      },
    });

    await app.start();
  }

  public guard(request: Request): void {
    const requestPath = new URL(request.url).pathname;

    if (!GUARDED_PATHS.some((path) => requestPath.startsWith(path))) {
      return;
    }

    if (request.headers.get('X-CSS-Secret') === env('CSS_SECRET')) {
      return;
    }

    throw status(403, 'Forbidden');
  }

  public async proxy(request: Request): Promise<Response> {
    const url = new URL(request.url);

    return fetch(`http://localhost${url.pathname}${url.search}`, {
      unix: CSS_SOCKET,
      method: request.method,
      headers: request.headers,
      body: ['GET', 'HEAD'].includes(request.method) ? undefined : request.body,
      redirect: 'manual',
    });
  }

  public async privilegedFetch(path: string, options: RequestInit = {}): Promise<Response> {
    const headers = new Headers(options.headers);

    // TODO is this even necessary!? This request goes straight to the CSS server, not Elysia
    headers.set('X-CSS-Secret', env('CSS_SECRET'));

    return fetch(`http://localhost${path}`, {
      ...options,
      unix: CSS_SOCKET,
      headers,
      redirect: 'manual',
    });
  }
}

export default facade(SolidServerService);
