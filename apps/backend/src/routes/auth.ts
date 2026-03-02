import type { SolidUserProfile } from '@noeldemartin/solid-utils';
import { Elysia, redirect } from 'elysia';
import z from 'zod';

import { FRONTEND_URL, PORT } from '../lib/constants';
import Auth from '../services/Auth';

export default new Elysia()
  .get('clientid.jsonld', () => ({
    '@context': ['https://www.w3.org/ns/solid/oidc-context.jsonld'],
    client_id: `http://localhost:${PORT}/clientid.jsonld`,
    client_name: 'Ànima',
    redirect_uris: [`http://localhost:${PORT}/oidc/redirect`],
    post_logout_redirect_uris: [`http://localhost:${PORT}/oidc/logout`],
    grant_types: ['authorization_code', 'refresh_token'],
    scope: 'openid webid offline_access',
    response_types: ['code'],
    token_endpoint_auth_method: 'none',
    application_type: 'web',
    require_auth_time: false,
  }))
  .get(
    '/oidc/session',
    async ({ request }) => {
      const session = await Auth.session(request);

      if (!session) {
        return null;
      }

      return { user: session.user };
    },
    {
      response: z.union([z.object({ user: z.any().transform((value) => value as SolidUserProfile) }), z.null()]),
    },
  )
  .post('/oidc/login', ({ body: { oidcIssuer } }) => Auth.login(oidcIssuer), {
    body: z.object({ oidcIssuer: z.string() }),
    response: z.object({ sessionId: z.string(), redirectUrl: z.string() }),
  })
  .post('/oidc/logout', ({ request }) => Auth.logout(request))
  .get('/oidc/redirect', async ({ request }) => {
    await Auth.handleRedirect(request);

    return redirect(FRONTEND_URL);
  })
  .post(
    '/solid-proxy',
    async ({ request, body: { input, init } }) => {
      const session = await Auth.requireSession(request);

      return session.fetch(input, init);
    },
    { body: z.object({ input: z.any(), init: z.any() }) },
  );
