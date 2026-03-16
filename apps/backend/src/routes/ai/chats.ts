import {
  AnimaChatSchema,
  tools,
  ModelsManager,
  type AnimaUIMessage,
  systemPrompt,
  AnimaChatEditableFieldsSchema,
  type AnimaChat,
  ChatsManager,
  messagesIdGenerator,
} from '@anima/core';
import { objectKeys, required } from '@noeldemartin/utils';
import { convertToModelMessages, stepCountIs, streamText } from 'ai';
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
      '/:url',
      ({ request, params: { url }, body: updates }) =>
        Auth.runForRequest(request, async () => {
          const chat = await ChatsManager.getChat(url);

          if (!chat) {
            throw status(404, 'Chat not found');
          }

          await ChatsManager.updateChat(url, updates);
        }),
      {
        params: z.object({ url: z.string().brand('AnimaChatUrl') }),
        body: AnimaChatEditableFieldsSchema.partial(),
      },
    )
    .get(
      '/:url/messages',
      ({ request, params: { url } }) =>
        Auth.runForRequest(request, async () => {
          const chat = await ChatsManager.getChat(url);

          if (!chat) {
            throw status(404, 'Chat not found');
          }

          return ChatsManager.getChatMessages(chat);
        }),
      {
        params: z.object({ url: z.string().brand('AnimaChatUrl') }),
        response: z.array(z.any()),
      },
    )
    .post(
      '/:url/messages',
      ({ request, params: { url }, body: { model: modelId, message } }) =>
        Auth.runForRequest(request, async () => {
          const chat = await ChatsManager.getChat(url);
          const model = await ModelsManager.getModel(modelId);

          if (!chat) {
            throw status(404, 'Chat not found');
          }

          if (!model) {
            throw status(404, 'Model not found');
          }

          if (message.metadata?.createdAt) {
            message.metadata.createdAt = new Date(message.metadata.createdAt);
          }

          const { languageModel, supportsTools, providerOptions } = await ModelsManager.createLanguageModel(modelId);

          const session = Auth.requireContextSession();
          const messages = await ChatsManager.getChatMessages(chat);
          const provider = required(await ModelsManager.getProvider(model.providerId));
          const originalMessages = [...messages, message];

          await ChatsManager.storeChatMessage(message);

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
            generateMessageId: messagesIdGenerator(chat.url),
            messageMetadata({ part }) {
              if (part.type !== 'start') {
                return;
              }

              return {
                model: modelId,
                provider: provider.type,
                createdAt: new Date(),
              };
            },
            async onFinish({ messages }) {
              await Promise.all(messages.map((message) => ChatsManager.storeChatMessage(message)));
              await ChatsManager.updateChat(chat.url, {}); // touch timestamps
            },
          });
        }),
      {
        params: z.object({ url: z.string().brand('AnimaChatUrl') }),
        body: z.object({
          model: z.string().brand('ModelId'),
          message: z.any().transform((value) => value as AnimaUIMessage),
        }),
      },
    ),
);
