import type { SolidUserProfile } from '@noeldemartin/solid-utils';
import { Elysia } from 'elysia';
import z from 'zod';

import Auth from '../../services/Auth';

export default new Elysia({ prefix: '/auth' })
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
  .post('/login', ({ body: { oidcIssuer } }) => Auth.loginWithOidc(oidcIssuer), {
    body: z.object({ oidcIssuer: z.string() }),
    response: z.object({ sessionId: z.string(), redirectUrl: z.string() }),
  })
  .post('/logout', ({ request }) => Auth.logout(request))
  .post(
    '/proxy',
    async ({ request, body: { input, init } }) => {
      const session = await Auth.requireSession(request);

      return session.fetch(input, init);
    },
    { body: z.object({ input: z.any(), init: z.any() }) },
  );
