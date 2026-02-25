import Elysia from 'elysia';
import z from 'zod';

import AI from '../../services/AI';
import Auth from '../../services/Auth';

export default new Elysia().group('chat', (app) =>
  app.post(
    '/',
    async ({ request, body: { model, message } }) => {
      const session = await Auth.requireSession(request);

      return AI.prompt(session, model, message);
    },
    {
      body: z.object({ model: z.string(), message: z.string() }),
      response: z.string(),
    },
  ),
);
