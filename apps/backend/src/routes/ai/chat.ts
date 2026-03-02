import { tools, ModelsManager, systemPrompt } from '@anima/core';
import { objectKeys } from '@noeldemartin/utils';
import { convertToModelMessages, stepCountIs, streamText } from 'ai';
import Elysia from 'elysia';
import z from 'zod';

import Auth from '../../services/Auth';

export default new Elysia().group('chat', (app) =>
  app.post(
    '/',
    async ({ request, body: { provider, model, messages } }) => {
      const session = await Auth.requireSession(request);
      const {
        model: languageModel,
        supportsTools,
        providerOptions,
      } = await ModelsManager.createLanguageModel(provider, model);

      return Auth.runWithSession(session, async () => {
        const result = streamText({
          tools,
          providerOptions,
          model: languageModel,
          activeTools: supportsTools ? objectKeys(tools) : [],
          messages: await convertToModelMessages(messages),
          system: systemPrompt(session.user),
          stopWhen: stepCountIs(10),
        });

        return result.toUIMessageStreamResponse();
      });
    },
    {
      body: z.object({
        provider: z.string().brand('ProviderName'),
        model: z.string().brand('ModelName'),
        messages: z.array(z.any()),
      }),
    },
  ),
);
