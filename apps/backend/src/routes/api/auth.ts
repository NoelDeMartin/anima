import type { SolidUserProfile } from '@noeldemartin/solid-utils';
import { Elysia } from 'elysia';
import z from 'zod';

import { SolidServerError } from '../../lib/errors/SolidServerError';
import Auth from '../../services/Auth';
import SolidServer, { CreateAccountOptionsSchema } from '../../services/SolidServer';

export default new Elysia({ prefix: '/auth' })
  .error({ SolidServerError })
  .onError(({ error }) => SolidServer.handleError(error))
  .get(
    '/session',
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
  .post(
    '/login',
    async ({ body }) => {
      if ('oidcIssuer' in body) {
        return Auth.loginWithOidc(body.oidcIssuer);
      }

      SolidServer.assertEnabled();

      const { sessionId } = await Auth.loginWithManagedSession(body);

      return { sessionId };
    },
    {
      body: z.union([z.object({ oidcIssuer: z.string() }), z.object({ email: z.email(), password: z.string() })]),
      response: z.object({ sessionId: z.string(), redirectUrl: z.string().optional() }),
    },
  )
  .post(
    '/signup',
    async ({ body }) => {
      SolidServer.assertEnabled();

      await SolidServer.createAccount(body);
    },
    { body: CreateAccountOptionsSchema },
  )
  .post('/logout', async ({ request, set }) => {
    await Auth.logout(request);

    if (SolidServer.isEnabled()) {
      set.headers['set-cookie'] = SolidServer.expiredPodSessionCookie();
    }
  })
  .post(
    '/proxy',
    async ({ request, body: { input, init } }) => {
      const session = await Auth.requireSession(request);

      return session.fetch(input, init);
    },
    { body: z.object({ input: z.any(), init: z.any() }) },
  );
