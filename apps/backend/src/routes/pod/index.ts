import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { Elysia } from 'elysia';

import { FRONTEND_ASSETS, frontendUrl, POD_URL } from '../../lib/constants';
import { env } from '../../lib/env';
import SolidServer from '../../services/SolidServer';

function isHomeRequest(request: Request): boolean {
  return new URL(request.url).pathname === '/pod/' && request.method !== 'OPTIONS';
}

function isHtmlRequest(request: Request): boolean {
  return request.headers.get('sec-fetch-mode') === 'navigate' || !!request.headers.get('accept')?.includes('text/html');
}

function homeResponse(request: Request): Response {
  if (!['GET', 'HEAD'].includes(request.method)) {
    return new Response(null, { status: 405, headers: { allow: 'GET, HEAD, OPTIONS' } });
  }

  if (!isHtmlRequest(request)) {
    return new Response(null, { status: 404 });
  }

  if (!env('SERVE_FRONTEND')) {
    return Response.redirect(frontendUrl('/pod/'), 302);
  }

  return new Response(readFileSync(join(FRONTEND_ASSETS, 'index.html')), {
    headers: { 'content-type': 'text/html; charset=utf-8' },
  });
}

function handle(request: Request): Response | Promise<Response> {
  if (isHomeRequest(request)) {
    return homeResponse(request);
  }

  return SolidServer.proxy(request);
}

export function getOpenIdConfiguration({ request }: { request: Request }): Promise<Response> {
  SolidServer.assertEnabled();

  return SolidServer.proxy(
    new Request(new URL('.well-known/openid-configuration', POD_URL), { headers: request.headers }),
  );
}

export default new Elysia()
  .onBeforeHandle(() => SolidServer.assertEnabled())
  .get('/', ({ request }) => handle(request))
  .get('*', ({ request }) => handle(request))
  .all('/', ({ request }) => handle(request))
  .all('*', ({ request }) => handle(request));
