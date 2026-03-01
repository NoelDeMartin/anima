import { ModelsManager, systemPrompt } from '@anima/core';
import { convertToModelMessages, stepCountIs, streamText } from 'ai';
import Elysia from 'elysia';
import z from 'zod';

import Auth from '../../services/Auth';
import getTypesIndex from '../../tools/getTypesIndex';
import listContainerFiles from '../../tools/listContainerFiles';
import readFileContents from '../../tools/readFileContents';

const tools = {
  getTypesIndex,
  listContainerFiles,
  readFileContents,
};

export type Tools = typeof tools;

export default new Elysia().group('chat', (app) =>
  app.post(
    '/',
    async ({ request, body: { provider, model, messages } }) => {
      const session = await Auth.requireSession(request);

      return Auth.runWithSession(session, async () => {
        const result = streamText({
          tools,
          messages: await convertToModelMessages(messages),
          model: await ModelsManager.createLanguageModel(provider, model),
          providerOptions: ModelsManager.getProviderOptions(provider, model),
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
