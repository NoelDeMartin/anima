import { spawn, type ChildProcess } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readdirSync, rmdirSync, unlinkSync } from 'node:fs';
import { createRequire } from 'node:module';
import { isAbsolute, join } from 'node:path';

import { facade, isDevelopment, isInstanceOf, PromisedValue, sleep } from '@noeldemartin/utils';
import { status } from 'elysia';
import { Agent, fetch as undiciFetch } from 'undici';
import { z } from 'zod';

import CommunityServerControls, { type InteractionOptions } from '../lib/CommunityServerControls';
import CommunityServerInteractionConfig from '../lib/CommunityServerInteractionConfig';
import CommunityServerStorageConfig from '../lib/CommunityServerStorageConfig';
import { frontendUrl, POD_URL, ROOT_STORAGE } from '../lib/constants';
import { env } from '../lib/env';
import { SolidServerError } from '../lib/errors/SolidServerError';

const require = createRequire(import.meta.url);
const ACCOUNT_API_PATH = /^\/pod\/\.account(\/|$)/;
const CSS_STATIC_FILES_PATH = /^\/pod\/(\.well-known\/css(\/|$)|favicon\.ico$)/;
const CLIENT_PROXY_HEADERS = ['host', 'forwarded', 'x-forwarded-host', 'x-forwarded-proto', 'x-forwarded-for'];
const HOP_BY_HOP_HEADERS = ['connection', 'keep-alive', 'transfer-encoding'];
const AUTHORIZATION_API_PATH = '/api/pod/authorize';
const POD_SESSION_COOKIE = 'css-account';
const POD_SESSION_COOKIE_MAX_AGE = 14 * 24 * 60 * 60;
const SIGNAL_EXIT_CODES = { SIGINT: 130, SIGTERM: 143 } as const;
const READY_POLL_MS = 100;
const READY_TIMEOUT_MS = 30_000;
const INTERACTION_COOKIE = '_interaction';
const INTERACTION_COOKIES = [INTERACTION_COOKIE, `${INTERACTION_COOKIE}.sig`];

function cssStorageConfigPath(): string {
  return join(ROOT_STORAGE, 'css-storage.json');
}

function cssInteractionConfigPath(): string {
  return join(ROOT_STORAGE, 'css-interaction.json');
}

function cssSocketPath(): string {
  const name = isDevelopment() ? 'css-dev' : 'css';

  if (process.platform !== 'win32') {
    return join(ROOT_STORAGE, `${name}.sock`);
  }

  const storageHash = createHash('sha256').update(ROOT_STORAGE).digest('hex').slice(0, 12);

  return `\\\\.\\pipe\\anima-${name}-${storageHash}`;
}

function normalizePath(path: string): string {
  const decoded = path
    .split('/')
    .map((segment) => {
      try {
        return decodeURIComponent(segment);
      } catch {
        return segment;
      }
    })
    .join('/');

  return decoded.replace(/\/{2,}/g, '/');
}

function parseCookies(header: string | null): Record<string, string> {
  const cookies: Record<string, string> = {};

  for (const pair of header?.split(';') ?? []) {
    const index = pair.indexOf('=');

    if (index === -1) {
      continue;
    }

    cookies[pair.slice(0, index).trim()] = pair.slice(index + 1).trim();
  }

  return cookies;
}

function safeWebUrl(url: string | undefined): string | undefined {
  try {
    return url && ['http:', 'https:'].includes(new URL(url).protocol) ? url : undefined;
  } catch {
    return undefined;
  }
}

function isInteractionCookie(cookie: string): boolean {
  return INTERACTION_COOKIES.some((name) => cookie.startsWith(`${name}=`));
}

function assertPublicPath(path: string): void {
  const normalizedPath = normalizePath(path);

  if (ACCOUNT_API_PATH.test(normalizedPath)) {
    throw status(403, 'Forbidden');
  }

  if (CSS_STATIC_FILES_PATH.test(normalizedPath)) {
    throw status(404, 'Not Found');
  }
}

function withoutClientProxyHeaders(requestHeaders: Headers): Headers {
  const headers = new Headers(requestHeaders);

  for (const header of [...CLIENT_PROXY_HEADERS, ...HOP_BY_HOP_HEADERS]) {
    headers.delete(header);
  }

  return headers;
}

function withPublicUrlHeaders(requestHeaders: HeadersInit | undefined): Headers {
  const headers = new Headers(requestHeaders);
  const publicUrl = new URL(POD_URL);

  headers.delete('forwarded');
  headers.set('x-forwarded-host', publicUrl.host);
  headers.set('x-forwarded-proto', publicUrl.protocol.slice(0, -1));

  return headers;
}

function removeHopByHopHeaders(headers: Headers): void {
  for (const header of HOP_BY_HOP_HEADERS) {
    headers.delete(header);
  }
}

function removeDecompressedBodyHeaders(headers: Headers): void {
  if (!headers.has('content-encoding')) {
    return;
  }

  headers.delete('content-encoding');
  headers.delete('content-length');
}

function scopeInteractionCookiesToAuthorizationApi(headers: Headers): void {
  const cookies = headers.getSetCookie();

  if (!cookies.some(isInteractionCookie)) {
    return;
  }

  headers.delete('set-cookie');

  for (const cookie of cookies) {
    headers.append(
      'set-cookie',
      isInteractionCookie(cookie) ? cookie.replace(/;\s*path=[^;]*/i, `; path=${AUTHORIZATION_API_PATH}`) : cookie,
    );
  }
}

function proxyResponseHeaders(response: Response): Headers {
  const headers = new Headers(response.headers);

  removeHopByHopHeaders(headers);
  removeDecompressedBodyHeaders(headers);
  scopeInteractionCookiesToAuthorizationApi(headers);

  return headers;
}

export const CreateAccountOptionsSchema = z.object({
  email: z.email(),
  username: z.string().regex(/^[a-z0-9]+$/i),
  password: isDevelopment() ? z.string() : z.string().min(8),
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

export const AuthorizationDetailsSchema = z.object({
  prompt: z.enum(['login', 'consent']),
  loggedIn: z.boolean(),
  client: z.object({
    id: z.string().optional(),
    name: z.string().optional(),
    url: z.url({ protocol: /^https?$/ }).optional(),
    logoUrl: z.url({ protocol: /^https?$/ }).optional(),
  }),
});

export type CreateAccountOptions = z.infer<typeof CreateAccountOptionsSchema>;
export type AuthorizationDetails = z.infer<typeof AuthorizationDetailsSchema>;

export class SolidServerService {
  private process: ChildProcess | null = null;
  private cssStorageConfig: CommunityServerStorageConfig | null = null;
  private exitHandlersRegistered = false;
  private cssDispatcher = new Agent({ connect: { socketPath: cssSocketPath() } });
  private cssControls = new CommunityServerControls(POD_URL, (input, init) => this.internalFetch(input, init));

  constructor() {
    const configPath = cssStorageConfigPath();

    if (existsSync(configPath)) {
      this.cssStorageConfig = new CommunityServerStorageConfig(configPath);
    }
  }

  public isEnabled(): boolean {
    return env('MANAGED_POD');
  }

  public assertEnabled() {
    if (this.isEnabled()) {
      return;
    }

    throw status(404, 'Managed POD is disabled');
  }

  public handleError(error: unknown) {
    if (!isInstanceOf(error, SolidServerError)) {
      return;
    }

    return status(error.code, { type: 'solid_server_error', message: error.message });
  }

  public async restart(): Promise<void> {
    await this.stop();
    await this.start();
  }

  public async start(): Promise<void> {
    if (this.process) {
      return;
    }

    const socketPath = cssSocketPath();
    const serverScript = require.resolve('@solid/community-server/bin/server.js');
    const cmdArgs = [serverScript, '-b', POD_URL, '--socket', socketPath];
    const interactionConfig = CommunityServerInteractionConfig.create(cssInteractionConfigPath(), {
      interactionUrl: frontendUrl('/authorize/'),
    });

    mkdirSync(ROOT_STORAGE, { recursive: true });

    if (process.platform !== 'win32' && existsSync(socketPath)) {
      unlinkSync(socketPath);
    }

    if (env('E2E')) {
      cmdArgs.push('-c', '@css:config/default.json', '-l', 'warn');
    } else {
      cmdArgs.push('-c', this.getStorageConfig().path, '-f', this.internalPath());
    }

    cmdArgs.push('-c', interactionConfig.path);

    const childProcess = spawn(process.execPath, cmdArgs, {
      stdio: 'inherit',
    });

    this.process = childProcess;

    this.registerExitHandlers();

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

  public async proxy(request: Request): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === '/pod') {
      return Response.redirect(POD_URL, 302);
    }

    assertPublicPath(url.pathname);

    const response = await this.internalFetch(`${url.pathname}${url.search}`, {
      method: request.method,
      headers: withoutClientProxyHeaders(request.headers),
      body: ['GET', 'HEAD'].includes(request.method) ? undefined : request.body,
      redirect: 'manual',
    });

    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: proxyResponseHeaders(response),
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

    const config = this.getStorageConfig();

    if (storageRoot !== config.getUserPodStorageRoot(username)) {
      config.setUserPodStorageRoot(username, storageRoot, { baseUrl: POD_URL });

      await this.restart();
    }
  }

  public async login(options: LoginOptions): Promise<SolidCredentials> {
    return this.cssControls.login(options);
  }

  public async logout(credentials: SolidCredentials): Promise<void> {
    await this.cssControls.logout(credentials.authorization);
  }

  public async getAuthorization(request: Request, credentials: SolidCredentials | null): Promise<AuthorizationDetails> {
    const { prompt, client } = await this.cssControls.getInteraction(this.interactionOptions(request, credentials));

    return {
      prompt,
      loggedIn: !!credentials,
      client: {
        id: client.client_id,
        name: client.client_name,
        url: safeWebUrl(client.client_uri),
        logoUrl: safeWebUrl(client.logo_uri),
      },
    };
  }

  public async loginAuthorization(request: Request, credentials: SolidCredentials): Promise<string> {
    return this.cssControls.pickInteractionWebId(credentials.webId, {
      ...this.interactionOptions(request, credentials),
      authorization: credentials.authorization,
    });
  }

  public async consentAuthorization(request: Request, credentials: SolidCredentials): Promise<string> {
    return this.cssControls.consentInteraction(this.interactionOptions(request, credentials));
  }

  public async cancelAuthorization(request: Request, credentials: SolidCredentials | null): Promise<string> {
    return this.cssControls.cancelInteraction(this.interactionOptions(request, credentials));
  }

  public podSessionCookie(credentials: SolidCredentials): string {
    return `${POD_SESSION_COOKIE}=${credentials.authorization}; Path=/pod/; Max-Age=${POD_SESSION_COOKIE_MAX_AGE}; HttpOnly; SameSite=Lax`;
  }

  public expiredPodSessionCookie(): string {
    return `${POD_SESSION_COOKIE}=; Path=/pod/; Max-Age=0; HttpOnly; SameSite=Lax`;
  }

  private interactionOptions(request: Request, credentials: SolidCredentials | null): InteractionOptions {
    const cookies = parseCookies(request.headers.get('cookie'));

    if (!cookies[INTERACTION_COOKIE]) {
      throw status(404, 'Authorization request not found');
    }

    return {
      cookies: INTERACTION_COOKIES.filter((name) => name in cookies)
        .map((name) => `${name}=${cookies[name]}`)
        .join('; '),
      authorization: credentials?.authorization,
    };
  }

  private registerExitHandlers(): void {
    if (this.exitHandlersRegistered) {
      return;
    }

    const killChild = () => this.process?.kill();

    process.once('exit', killChild);

    for (const [signal, exitCode] of Object.entries(SIGNAL_EXIT_CODES)) {
      process.once(signal, () => {
        killChild();
        process.exit(exitCode);
      });
    }

    this.exitHandlersRegistered = true;
  }

  private internalPath(): string {
    return join(ROOT_STORAGE, 'data');
  }

  private getStorageConfig(): CommunityServerStorageConfig {
    const configPath = cssStorageConfigPath();

    mkdirSync(this.internalPath(), { recursive: true });

    return (this.cssStorageConfig ??= existsSync(configPath)
      ? new CommunityServerStorageConfig(configPath)
      : CommunityServerStorageConfig.create(configPath, {
          internalPath: this.internalPath(),
          baseUrl: POD_URL,
        }));
  }

  private async waitReady(process: ChildProcess): Promise<void> {
    const deadline = Date.now() + READY_TIMEOUT_MS;

    while (Date.now() < deadline) {
      if (process.exitCode !== null) {
        throw new SolidServerError(500, `Solid server exited before being ready (code ${process.exitCode}).`);
      }

      try {
        await this.internalFetch(POD_URL, { signal: AbortSignal.timeout(READY_POLL_MS) });

        return;
      } catch {
        await sleep(READY_POLL_MS);
      }
    }

    throw new SolidServerError(500, 'Solid server not ready after timeout.');
  }

  private async internalFetch(input: string | URL | Request, init: RequestInit = {}): Promise<Response> {
    const url = new URL(input instanceof Request ? input.url : input, POD_URL);
    const response = await undiciFetch(`http://localhost${url.pathname}${url.search}`, {
      ...(init as Parameters<typeof undiciFetch>[1]),
      headers: Object.fromEntries(withPublicUrlHeaders(init.headers)),
      duplex: init.body ? 'half' : undefined,
      dispatcher: this.cssDispatcher,
    });

    return response as unknown as Response;
  }
}

export default facade(SolidServerService);
