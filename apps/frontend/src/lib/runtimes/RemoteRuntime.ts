import { Chat } from '@ai-sdk/vue';
import type { ApiAnimaChat } from '@anima/backend';
import {
  type AnimaUIMessage,
  type AIModel,
  type AnimaChat,
  type ProviderName,
  type ModelMetadataEditableFields,
  type ModelName,
  type AnimaChatEditableFields,
  messagesIdGenerator,
  type AIProvider,
} from '@anima/core';
import type { Treaty } from '@elysiajs/eden';
import { required } from '@noeldemartin/utils';
import { DefaultChatTransport } from 'ai';

import { getSessionId } from '@/auth/session';
import api from '@/lib/api';
import { env } from '@/lib/env';
import AI from '@/services/AI';

import type Runtime from './Runtime';

function mapChat(chat: ApiAnimaChat): AnimaChat {
  return {
    ...chat,
    createdAt: new Date(chat.createdAt),
    updatedAt: new Date(chat.updatedAt),
  };
}

export default class RemoteRuntime implements Runtime {
  async initialize(): Promise<{ chats: AnimaChat[]; models: AIModel[]; providers: AIProvider[] }> {
    const sessionId = getSessionId();

    if (!sessionId) {
      return { chats: [], models: [], providers: [] };
    }

    const headers = { 'X-Anima-Session-Id': sessionId };
    const chats = await this.treatyResponse(api['ai'].chats.get({ headers }), []);
    const models = await this.treatyResponse(api['ai'].models.get({ headers }), []);
    const providers = await this.treatyResponse(api['ai'].models.providers.get({ headers }), []);

    return {
      chats: chats.map(mapChat),
      models,
      providers,
    };
  }

  async getChats(): Promise<AnimaChat[]> {
    const chats = await this.treatyResponse(api['ai'].chats.get(), []);

    return chats.map(mapChat);
  }

  async getModels(): Promise<AIModel[]> {
    return this.treatyResponse(api['ai'].models.get(), []);
  }

  async getProviders(): Promise<AIProvider[]> {
    return this.treatyResponse(api['ai'].models.providers.get(), []);
  }

  async createAnimaChat(chat: AnimaChatEditableFields): Promise<AnimaChat> {
    const { data, error } = await api['ai'].chats.post(chat);

    if (!data) {
      throw error ?? new Error('Failed to create chat');
    }

    return mapChat(data);
  }

  async createAIChat(chat: AnimaChat, options: { loadMessages: boolean }): Promise<Chat<AnimaUIMessage>> {
    const { data: messages, error } = options.loadMessages
      ? await api['ai'].chats({ url: encodeURIComponent(chat.url) }).messages.get()
      : { data: [] };

    if (!messages) {
      throw error ?? new Error('Failed to get chat messages');
    }

    return new Chat<AnimaUIMessage>({
      id: chat.url,
      messages,
      generateId: messagesIdGenerator(chat.url),
      transport: new DefaultChatTransport({
        api: `${window.location.protocol}//${env('VITE_API_DOMAIN')}/ai/chats/${encodeURIComponent(chat.url)}/messages`,
        headers: { 'X-Anima-Session-Id': required(getSessionId()) },
        prepareSendMessagesRequest({ messages, body }) {
          return { body: { message: messages[messages.length - 1], ...body } };
        },
      }),
    });
  }

  async updateChat(url: AnimaChat['url'], updates: Partial<AnimaChatEditableFields>): Promise<void> {
    const { error } = await api['ai'].chats({ url: encodeURIComponent(url) }).patch(updates);

    if (error) {
      throw error;
    }
  }

  sendMessage(chat: Chat<AnimaUIMessage>, message: string): Promise<void> {
    if (!AI.selectedModel) {
      throw new Error('No selected model');
    }

    return chat.sendMessage(
      { text: message, metadata: { createdAt: new Date() } },
      { body: { provider: AI.selectedModel?.provider, model: AI.selectedModel?.name } },
    );
  }

  async installModel(
    provider: ProviderName,
    name: ModelName,
    data: ModelMetadataEditableFields = { enabled: true },
  ): Promise<AIModel> {
    const { data: responseData } = await api['ai'].models.post({
      name,
      provider,
      ...data,
    });

    return required(responseData);
  }

  async updateModel(
    provider: ProviderName,
    name: ModelName,
    updates: Partial<ModelMetadataEditableFields>,
  ): Promise<void> {
    const { error } = await api['ai'].models({ name }).patch({ provider, ...updates });

    if (error) {
      throw error;
    }
  }

  async deleteModel(provider: ProviderName, name: ModelName): Promise<void> {
    await api['ai'].models({ name }).delete({ provider });
  }

  async cancelModelInstallation(provider: ProviderName, name: ModelName): Promise<void> {
    await api['ai'].models({ name })['cancel-installation'].post({ provider });
  }

  private async treatyResponse<T extends Record<number, unknown>, TResponse extends Treaty.TreatyResponse<T>>(
    apiCall: Promise<TResponse>,
    defaultValue: NonNullable<TResponse['data']>,
  ): Promise<NonNullable<TResponse['data']>> {
    const { data, error, response } = await apiCall;

    if (error) {
      if (response.status === 401) {
        return defaultValue;
      }

      throw error;
    }

    return required(data);
  }
}
