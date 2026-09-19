import { spawn, type ChildProcess } from 'node:child_process';
import { mkdirSync } from 'node:fs';
import { createRequire } from 'node:module';
import { join } from 'node:path';

import { facade, PromisedValue, sleep } from '@noeldemartin/utils';
import { status } from 'elysia';

import CommunityServerControls from '../lib/CommunityServerControls';
import { ROOT_STORAGE } from '../lib/constants';
import { env } from '../lib/env';
import { SolidServerError } from '../lib/errors/SolidServerError';

const require = createRequire(import.meta.url);
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
  private process: ChildProcess | null = null;
  public readonly cssControls = new CommunityServerControls(ROOT_URL);

  public isEnabled(): boolean {
    return env('MANAGED_POD');
  }

  public async restart(): Promise<void> {
    await this.stop();
    await this.start();
  }

  public async start(): Promise<void> {
    if (!env('E2E')) {
      mkdirSync(join(ROOT_STORAGE, 'data'), { recursive: true });
    }

    const serverScript = require.resolve('@solid/community-server/bin/server.js');
    const cmdArgs = env('E2E')
      ? [serverScript, '-l', 'warn']
      : [serverScript, '-c', '@css:config/file.json', '-f', join(ROOT_STORAGE, 'data')];

    const childProcess = spawn(process.execPath, cmdArgs, {
      stdio: 'inherit',
    });

    this.process = childProcess;

    await this.waitReady(childProcess);
  }

  public async stop(): Promise<void> {
    if (!this.process) {
      return;
    }

    const process = this.process;
    const exited = new PromisedValue<void>();

    this.process = null;

    process.on('exit', () => exited.resolve());
    process.kill();

    await exited;
  }

  public guard(request: Request): void {
    const requestPath = new URL(request.url).pathname.replace(/^\/pod/, '') || '/';

    if (!GUARDED_PATHS.some((path) => requestPath.startsWith(path))) {
      return;
    }

    throw status(403, 'Forbidden');
  }

  public async proxy(request: Request): Promise<Response> {
    const url = new URL(request.url);
    const pathname = url.pathname.replace(/^\/pod/, '') || '/';

    return fetch(`${ROOT_URL}${pathname}${url.search}`, {
      method: request.method,
      headers: request.headers,
      body: ['GET', 'HEAD'].includes(request.method) ? undefined : request.body,
      redirect: 'manual',
    });
  }

  public async createAccount(options: CreateAccountOptions): Promise<void> {
    await this.cssControls.createAccount(options);
  }

  public async login(options: LoginOptions): Promise<SolidCredentials> {
    return this.cssControls.login(options);
  }

  private async waitReady(process: ChildProcess): Promise<void> {
    const deadline = Date.now() + READY_TIMEOUT_MS;

    while (Date.now() < deadline) {
      if (process.exitCode !== null) {
        throw new SolidServerError(500, `Solid server exited before being ready (code ${process.exitCode}).`);
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
