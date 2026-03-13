import {
  AnimaChatSchema,
  tools,
  ModelsManager,
  type AnimaUIMessage,
  systemPrompt,
  AnimaChatEditableFieldsSchema,
  type AnimaChat,
  ChatsManager,
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
      ({ request }) =>
        Auth.runForRequest(request, async () => {
          const chats = await ChatsManager.getChats();

          return chats.map(mapChat);
        }),
      { response: z.array(ApiAnimaChatSchema) },
    )
    .post(
      '/',
      ({ request, body: data }) =>
        Auth.runForRequest(request, async () => {
          const chat = await ChatsManager.createChat(data);

          return mapChat(chat);
        }),
      {
        body: AnimaChatEditableFieldsSchema,
        response: ApiAnimaChatSchema,
      },
    )
    .patch(
      '/:id',
      ({ request, params: { id }, body: updates }) =>
        Auth.runForRequest(request, async () => {
          const chat = await ChatsManager.getChat(id);

          if (!chat) {
            throw status(404, 'Chat not found');
          }

          await ChatsManager.updateChat(id, updates);
        }),
      {
        params: z.object({ id: z.string().brand('AnimaChatId') }),
        body: AnimaChatEditableFieldsSchema.partial(),
      },
    )
    .get(
      '/:id/messages',
      ({ request, params: { id } }) =>
        Auth.runForRequest(request, async () => {
          const chat = await ChatsManager.getChat(id);

          if (!chat) {
            throw status(404, 'Chat not found');
          }

          return ChatsManager.getChatMessages(chat);
        }),
      {
        params: z.object({ id: z.string().brand('AnimaChatId') }),
        response: z.array(z.any()),
      },
    )
    .post(
      '/:id/messages',
      ({ request, params: { id }, body: { provider, model, message } }) =>
        Auth.runForRequest(request, async () => {
          const chat = await ChatsManager.getChat(id);

          if (!chat) {
            throw status(404, 'Chat not found');
          }

          if (message.metadata?.createdAt) {
            message.metadata.createdAt = new Date(message.metadata.createdAt);
          }

          const {
            model: languageModel,
            supportsTools,
            providerOptions,
          } = await ModelsManager.createLanguageModel(provider, model);

          const session = Auth.requireContextSession();
          const messages = await ChatsManager.getChatMessages(chat);
          const originalMessages = [...messages, message];

          await ChatsManager.storeChatMessage(chat, message);

          const result = streamText({
            tools,
            providerOptions,
            model: languageModel,
            activeTools: supportsTools ? objectKeys(tools) : [],
            messages: await convertToModelMessages(originalMessages),
            system: systemPrompt(session.user),
            stopWhen: stepCountIs(10),
          });

          result.consumeStream();

          return result.toUIMessageStreamResponse({
            originalMessages,
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
              await Promise.all(messages.map((message) => ChatsManager.storeChatMessage(chat, message)));
              await ChatsManager.updateChat(chat.id, {}); // touch timestamps
            },
          });
        }),
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
