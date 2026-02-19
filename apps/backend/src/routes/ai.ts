import Elysia, { t } from 'elysia';
import { generateText } from 'ai';

import Auth from '../services/Auth';
import AI from '../services/AI';

export default new Elysia()
  .post(
    '/ai/model',
    async ({ request, body: { model } }) => {
      const session = await Auth.session(request);

      if (!session?.user) {
        throw new Error('You must be logged in to use this endpoint');
      }

      Auth.update(session, { model });
    },
    { body: t.Object({ model: t.String() }) },
  )
  .post(
    '/ai/message',
    async ({ request, body: { message } }) => {
      const session = await Auth.session(request);

      if (!session?.user) {
        throw new Error('You must be logged in to use this endpoint');
      }

      const { text } = await generateText({
        model: AI.model(session.model),
        providerOptions: { ollama: { think: false } },
        prompt: `
            You are a helpful assistant.
            You are talking to a user with the following profile information: ${JSON.stringify(session.user)}.
            Reply to the following message that the user sent you:

            ${message}
        `,
      });

      return { message: text };
    },
    {
      body: t.Object({ message: t.String() }),
      response: t.Object({ message: t.String() }),
    },
  );
