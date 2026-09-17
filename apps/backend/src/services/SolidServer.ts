import { mkdirSync } from 'node:fs';
import { join } from 'node:path';

import { facade, sleep } from '@noeldemartin/utils';
import type { Subprocess } from 'bun';
import { status } from 'elysia';

import CommunityServerControls from '../lib/CommunityServerControls';
import { ROOT_STORAGE } from '../lib/constants';
import { env } from '../lib/env';
import { SolidServerError } from '../lib/errors/SolidServerError';

const GUARDED_PATHS = ['/idp/register/', '/pod/create/'];
const ROOT_URL = 'http://localhost:3000';
const READY_POLL_MS = 100;
const READY_TIMEOUT_MS = 30_000;

export interface CreateAccountOptions {
  email: string;
  username: string;
  password: string;
}

export interface LoginOptions {
  email: string;
  password: string;
}

export interface SolidCredentials {
  authorization: string;
  webId: string;
  clientId: string;
  clientSecret: string;
  oidcIssuer: string;
}

export class SolidServerService {
  private process: Subprocess | null = null;
  public readonly cssControls = new CommunityServerControls(ROOT_URL);

  public isEnabled(): boolean {
    return env('MANAGED_POD');
  }

  public async restart(): Promise<void> {
    if (!this.isEnabled() || !this.process) {
      return;
    }

    const process = this.process;

    this.process = null;

    process.kill();

    await process.exited;
    await this.start();
  }

  public async start(): Promise<void> {
    if (!this.isEnabled() || this.process) {
      return;
    }

    if (!env('E2E')) {
      mkdirSync(join(ROOT_STORAGE, 'data'), { recursive: true });
    }

    const args = env('E2E')
      ? ['community-solid-server', '-l', 'warn']
      : ['community-solid-server', '-c', '@css:config/file.json', '-f', join(ROOT_STORAGE, 'data')];

    this.process = Bun.spawn(args, {
      stdin: 'inherit',
      stdout: 'inherit',
    });

    await this.waitReady(this.process);
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

    return fetch(`${ROOT_URL}${url.pathname}${url.search}`, {
      method: request.method,
      headers: request.headers,
      body: ['GET', 'HEAD'].includes(request.method) ? undefined : request.body,
      redirect: 'manual',
    });
  }

  public async createAccount(options: CreateAccountOptions): Promise<void> {
    if (!this.isEnabled()) {
      throw new SolidServerError(400, 'Managed POD is disabled');
    }

    await this.cssControls.createAccount(options);
  }

  public async login(options: LoginOptions): Promise<SolidCredentials> {
    if (!this.isEnabled()) {
      throw new SolidServerError(400, 'Managed POD is disabled');
    }

    return this.cssControls.login(options);
  }

  private async waitReady(subprocess: Subprocess): Promise<void> {
    const deadline = Date.now() + READY_TIMEOUT_MS;

    while (Date.now() < deadline) {
      if (subprocess.exitCode !== null) {
        throw new SolidServerError(500, `Solid server exited before being ready (code ${subprocess.exitCode}).`);
      }

      try {
        await fetch(ROOT_URL, { signal: AbortSignal.timeout(READY_POLL_MS) });

        return;
      } catch {
        await sleep(READY_POLL_MS);
      }
    }

    throw new SolidServerError(500, 'Solid server not ready after timeout.');
  }
}

export default facade(SolidServerService);
