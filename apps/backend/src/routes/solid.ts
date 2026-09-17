import { Elysia, status } from 'elysia';
import z from 'zod';

import { SolidServerError } from '../lib/errors/SolidServerError';
import Auth from '../services/Auth';
import SolidServer from '../services/SolidServer';

export default new Elysia()
  .error({ SolidServerError })
  .onStart(() => {
    if (SolidServer.isEnabled()) {
      void SolidServer.start();
    }
  })
  .onRequest(({ request }) => {
    if (!SolidServer.isEnabled()) {
      return;
    }

    SolidServer.guard(request);
  })
  .onError(({ error }) => {
    if (error instanceof SolidServerError) {
      return status(error.code, { type: 'solid_server_error', message: error.message });
    }

    throw error;
  })
  .post(
    '/signup',
    async ({ body: { email, username, password } }) => {
      if (!SolidServer.isEnabled()) {
        throw status(404, 'Managed POD is disabled');
      }

      await SolidServer.createAccount({ email, username, password });
    },
    {
      body: z.object({
        email: z.email(),
        username: z.string(),
        password: z.string(),
      }),
    },
  )
  .post(
    '/login',
    async ({ body: { email, password } }) => {
      if (!SolidServer.isEnabled()) {
        throw status(404, 'Managed POD is disabled');
      }

      const { sessionId } = await Auth.loginWithManagedSession({ email, password });

      return { sessionId };
    },
    {
      body: z.object({ email: z.email(), password: z.string() }),
      response: z.object({ sessionId: z.string() }),
    },
  )
  .all('*', ({ request }) => {
    if (!SolidServer.isEnabled()) {
      throw status(404, 'Not Found');
    }

    return SolidServer.proxy(request);
  });
