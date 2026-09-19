import Elysia from 'elysia';

import { env } from '../lib/env';
import api from './api';
import e2e from './e2e';
import frontend from './frontend';
import oidc, { getClientIdDocument } from './oidc';
import pod from './pod';

export type Api = typeof api;

export function useRoutes(instance: Elysia) {
  instance
    .use(new Elysia().get('/clientid.jsonld', getClientIdDocument))
    .use(new Elysia({ prefix: '/oidc' }).use(oidc))
    .use(new Elysia({ prefix: '/pod' }).use(pod))
    .use(new Elysia({ prefix: '/api' }).use(api));

  if (env('E2E')) {
    instance.use(new Elysia({ prefix: '/__e2e__' }).use(e2e));
  }

  if (env('SERVE_FRONTEND')) {
    instance.use(frontend);
  }
}
