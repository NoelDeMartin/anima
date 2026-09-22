import { spawn, type ChildProcess } from 'node:child_process';
import { existsSync, mkdirSync, readdirSync, rmdirSync } from 'node:fs';
import { createRequire } from 'node:module';
import { isAbsolute, join } from 'node:path';

import { facade, PromisedValue, sleep } from '@noeldemartin/utils';
import { status } from 'elysia';
import { z } from 'zod';

import CommunityServerConfig from '../lib/CommunityServerConfig';
import CommunityServerControls from '../lib/CommunityServerControls';
import { ROOT_STORAGE } from '../lib/constants';
import { env } from '../lib/env';
import { SolidServerError } from '../lib/errors/SolidServerError';

const require = createRequire(import.meta.url);
const GUARDED_PATHS = ['/idp/register/', '/pod/create/'];
const ROOT_URL = 'http://localhost:3000';
const READY_POLL_MS = 100;
const READY_TIMEOUT_MS = 30_000;

function cssConfigPath(): string {
  return join(ROOT_STORAGE, 'css-config.json');
}

export const CreateAccountOptionsSchema = z.object({
  email: z.email(),
  username: z.string().regex(/^[a-z0-9]+$/i),
  password: z.string().min(8),
  storageRoot: z
    .string()
    .optional()
    .refine((value) => !value || isAbsolute(value), {
      message: 'The selected storage folder is not an absolute path.',
    }),
});

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

export type CreateAccountOptions = z.infer<typeof CreateAccountOptionsSchema>;

export class SolidServerService {
  private process: ChildProcess | null = null;
  private cssConfig: CommunityServerConfig | null = null;
  private cssControls = new CommunityServerControls(ROOT_URL);

  constructor() {
    const configPath = cssConfigPath();

    if (existsSync(configPath)) {
      this.cssConfig = new CommunityServerConfig(configPath);
    }
  }

  public isEnabled(): boolean {
    return env('MANAGED_POD');
  }

  public async restart(): Promise<void> {
    await this.stop();
    await this.start();
  }

  public async start(): Promise<void> {
    if (this.process) {
      return;
    }

    const internalPath = join(ROOT_STORAGE, 'data');
    const configPath = cssConfigPath();

    if (!env('E2E')) {
      mkdirSync(internalPath, { recursive: true });

      this.cssConfig ??= existsSync(configPath)
        ? new CommunityServerConfig(configPath)
        : CommunityServerConfig.create(configPath, {
            internalPath,
            baseUrl: ROOT_URL,
          });
    }

    const serverScript = require.resolve('@solid/community-server/bin/server.js');
    const cmdArgs = env('E2E') ? [serverScript, '-l', 'warn'] : [serverScript, '-c', configPath, '-f', internalPath];

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
    const listener = () => exited.resolve();

    this.process = null;

    if (process.exitCode !== null) {
      exited.resolve();
    } else {
      process.on('exit', listener);
      process.kill();
    }

    await exited;

    process.off('exit', listener);
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
    if (options.storageRoot) {
      await this.prepareStorageRoot(options.username, options.storageRoot);
    }

    await this.cssControls.createAccount(options);
  }

  private async prepareStorageRoot(username: string, storageRoot: string): Promise<void> {
    if (existsSync(storageRoot)) {
      const files = readdirSync(storageRoot);

      if (files.length > 0) {
        throw new SolidServerError(400, 'The selected storage folder is not empty. Please select an empty folder.');
      }

      rmdirSync(storageRoot);
    }

    const configPath = cssConfigPath();

    this.cssConfig ??= existsSync(configPath)
      ? new CommunityServerConfig(configPath)
      : CommunityServerConfig.create(configPath, {
          internalPath: join(ROOT_STORAGE, 'data'),
          baseUrl: ROOT_URL,
        });

    if (storageRoot !== this.cssConfig.getUserPodStorageRoot(username)) {
      this.cssConfig.setUserPodStorageRoot(username, storageRoot, { baseUrl: ROOT_URL });

      await this.restart();
    }
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
