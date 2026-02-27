import Elysia from 'elysia';
import z from 'zod';

import AI from '../../services/AI';
import Auth from '../../services/Auth';

export default new Elysia().group('chat', (app) =>
  app.post(
    '/',
    async ({ request, body: { model, messages } }) => {
      const session = await Auth.requireSession(request);

      return AI.prompt(session, model, messages);
    },
    {
      body: z.object({
        model: z.string(),
        messages: z.array(z.any()),
      }),
    },
  ),
);
