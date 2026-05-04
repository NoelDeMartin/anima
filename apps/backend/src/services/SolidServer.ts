import { join } from 'node:path';

import { facade } from '@noeldemartin/utils';
import type { Subprocess } from 'bun';
import { status } from 'elysia';

import { ROOT_STORAGE } from '../lib/constants';

const GUARDED_PATHS = ['/idp/register/', '/pod/create/'];

export class SolidServerService {
  private process: Subprocess | null = null;

  public async start(): Promise<void> {
    if (this.process) {
      return;
    }

    this.process = Bun.spawn(
      ['community-solid-server', '-c', '@css:config/file.json', '-f', join(ROOT_STORAGE, 'data')],
      // TODO config
      {
        stdin: 'inherit',
        stdout: 'inherit',
      },
    );
  }

  public guard(request: Request): void {
    const requestPath = new URL(request.url).pathname;

    if (!GUARDED_PATHS.some((path) => requestPath.startsWith(path))) {
      return;
    }

    throw status(403, 'Forbidden');
  }

  public async proxy(request: Request): Promise<Response> {
    const url = new URL(request.url);

    return fetch(`http://localhost:3000${url.pathname}${url.search}`, {
      method: request.method,
      headers: request.headers,
      body: ['GET', 'HEAD'].includes(request.method) ? undefined : request.body,
      redirect: 'manual',
    });
  }

  // TODO why do we need this one?
  public async privilegedFetch(path: string, options: RequestInit = {}): Promise<Response> {
    const headers = new Headers(options.headers);

    return fetch(`http://localhost:3000${path}`, {
      ...options,
      headers,
      redirect: 'manual',
    });
  }
}

export default facade(SolidServerService);
