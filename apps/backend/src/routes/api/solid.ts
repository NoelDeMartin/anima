import { Elysia, status } from 'elysia';
import z from 'zod';

import { SolidServerError } from '../../lib/errors/SolidServerError';
import Auth from '../../services/Auth';
import SolidServer from '../../services/SolidServer';

export default new Elysia()
  .error({ SolidServerError })
  .onStart(() => SolidServer.isEnabled() && SolidServer.start())
  .onStop(() => SolidServer.isEnabled() && SolidServer.stop())
  .onBeforeHandle(() => {
    if (SolidServer.isEnabled()) {
      return;
    }

    throw status(404, 'Managed POD is disabled');
  })
  .onError(({ error }) => {
    if (error instanceof SolidServerError) {
      return status(error.code, { type: 'solid_server_error', message: error.message });
    }
  })
  .post(
    '/signup',
    async ({ body: { email, username, password } }) => {
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
      const { sessionId } = await Auth.loginWithManagedSession({ email, password });

      return { sessionId };
    },
    {
      body: z.object({ email: z.email(), password: z.string() }),
      response: z.object({ sessionId: z.string() }),
    },
  );
