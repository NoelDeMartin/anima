import {
  storage,
  AnimaChatSchema,
  tools,
  ModelsManager,
  type AnimaUIMessage,
  systemPrompt,
  AnimaChatEditableFieldsSchema,
  type AnimaChat,
} from '@anima/core';
import { objectKeys } from '@noeldemartin/utils';
import { convertToModelMessages, createIdGenerator, stepCountIs, streamText } from 'ai';
import Elysia, { status } from 'elysia';
import z from 'zod';

import Auth from '../../services/Auth';

function mapChat(chat: AnimaChat): ApiAnimaChat {
  return {
    ...chat,
    createdAt: chat.createdAt.getTime(),
    updatedAt: chat.updatedAt.getTime(),
  };
}

export const ApiAnimaChatSchema = AnimaChatSchema.extend({
  createdAt: z.number(),
  updatedAt: z.number(),
});

export type ApiAnimaChat = z.infer<typeof ApiAnimaChatSchema>;

export default new Elysia().group('chats', (app) =>
  app
    .get(
      '/',
      async () => {
        const chats = await storage().getChats();

        return chats.map(mapChat);
      },
      { response: z.array(ApiAnimaChatSchema) },
    )
    .post(
      '/',
      async ({ body: data }) => {
        const chat = await storage().createChat(data);

        return mapChat(chat);
      },
      {
        body: AnimaChatEditableFieldsSchema,
        response: ApiAnimaChatSchema,
      },
    )
    .patch(
      '/:id',
      async ({ params: { id }, body: updates }) => {
        const chat = await storage().getChat(id);

        if (!chat) {
          throw status(404, 'Chat not found');
        }

        await storage().updateChat(id, updates);
      },
      {
        params: z.object({ id: z.string().brand('AnimaChatId') }),
        body: AnimaChatEditableFieldsSchema.partial(),
      },
    )
    .get(
      '/:id/messages',
      async ({ params: { id } }) => {
        const chat = await storage().getChat(id);

        if (!chat) {
          throw status(404, 'Chat not found');
        }

        return storage().getChatMessages(chat);
      },
      {
        params: z.object({ id: z.string().brand('AnimaChatId') }),
        response: z.array(z.any()),
      },
    )
    .post(
      '/:id/messages',
      async ({ request, params: { id }, body: { provider, model, message } }) => {
        const session = await Auth.requireSession(request);
        const chat = await storage().getChat(id);

        if (!chat) {
          throw status(404, 'Chat not found');
        }

        if (message.metadata?.createdAt) {
          message.metadata.createdAt = new Date(message.metadata.createdAt);
        }

        await storage().storeChatMessage(chat, message);

        const {
          model: languageModel,
          supportsTools,
          providerOptions,
        } = await ModelsManager.createLanguageModel(provider, model);

        const messages = await storage().getChatMessages(chat);

        return Auth.runWithSession(session, async () => {
          const result = streamText({
            tools,
            providerOptions,
            model: languageModel,
            activeTools: supportsTools ? objectKeys(tools) : [],
            messages: await convertToModelMessages([...messages, message]),
            system: systemPrompt(session.user),
            stopWhen: stepCountIs(10),
          });

          return result.toUIMessageStreamResponse({
            originalMessages: messages,
            generateMessageId: createIdGenerator(),
            messageMetadata({ part }) {
              if (part.type !== 'start') {
                return;
              }

              return {
                model,
                provider,
                createdAt: new Date(),
              };
            },
            async onFinish({ messages }) {
              await Promise.all(messages.map((message) => storage().storeChatMessage(chat, message)));
              await storage().updateChat(chat.id, {});
            },
          });
        });
      },
      {
        params: z.object({ id: z.string().brand('AnimaChatId') }),
        body: z.object({
          provider: z.string().brand('ProviderName'),
          model: z.string().brand('ModelName'),
          message: z.any().transform((value) => value as AnimaUIMessage),
        }),
      },
    ),
);
