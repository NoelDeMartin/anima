import { Chat } from '@ai-sdk/vue';
import type { UIMessage, AIModel, ModelData, ProviderName, ModelName } from '@anima/core';
import { required } from '@noeldemartin/utils';
import { DefaultChatTransport } from 'ai';

import api from '@/lib/api';
import { env } from '@/lib/env';
import AI from '@/services/AI';
import Auth from '@/services/Auth';

import type Runtime from './Runtime';

export default class RemoteRuntime implements Runtime {
  async initialize(): Promise<{ models: AIModel[]; providers: ProviderName[] }> {
    if (!Auth.sessionId) {
      return { models: [], providers: [] };
    }

    const headers = { 'X-Anima-Session-Id': Auth.sessionId };
    const { data: models } = await api['ai'].models.get({ headers });
    const { data: providers } = await api['ai'].models.providers.get({ headers });

    return { models: models ?? [], providers: providers ?? [] };
  }

  createChat(): Chat<UIMessage> {
    return new Chat<UIMessage>({
      transport: new DefaultChatTransport({
        api: `http://${env('VITE_API_DOMAIN')}/ai/chat`,
        headers: { 'X-Anima-Session-Id': required(Auth.sessionId) },
      }),
    });
  }

  sendMessage(chat: Chat<UIMessage>, message: string): Promise<void> {
    if (!AI.selectedModel) {
      throw new Error('No selected model');
    }

    return chat.sendMessage(
      { text: message },
      { body: { provider: AI.selectedModel?.provider, model: AI.selectedModel?.name } },
    );
  }

  async getModels(): Promise<AIModel[]> {
    const { data, error, response } = await api['ai'].models.get();

    if (error) {
      if (response.status === 401) {
        return [];
      }

      throw error;
    }

    return required(data);
  }

  async getProviders(): Promise<ProviderName[]> {
    const { data, error, response } = await api.ai.models.providers.get();

    if (error) {
      if (response.status === 401) {
        return [];
      }

      throw error;
    }

    return required(data);
  }

  async installModel(provider: ProviderName, name: ModelName, data: ModelData = { enabled: true }): Promise<AIModel> {
    const { data: responseData } = await api['ai'].models.post({
      name,
      provider,
      ...data,
    });

    return required(responseData);
  }

  async updateModel(provider: ProviderName, name: ModelName, updates: Partial<ModelData>): Promise<void> {
    await api['ai'].models({ name }).patch({ provider, ...updates });
  }

  async deleteModel(provider: ProviderName, name: ModelName): Promise<void> {
    await api['ai'].models({ name }).delete({ provider });
  }

  async cancelModelInstallation(provider: ProviderName, name: ModelName): Promise<void> {
    await api['ai'].models({ name })['cancel-installation'].post({ provider });
  }
}
