import { Events } from '@aerogel/core';
import { Router } from '@aerogel/plugin-routing';
import { Solid } from '@aerogel/plugin-solid';
import type {
  AIModel,
  ModelName,
  ProviderName,
  AnimaChat,
  AnimaChatEditableFields,
  ModelMetadataEditableFields,
} from '@anima/core';
import { facade, fail, objectFromEntries, objectKeys } from '@noeldemartin/utils';
import { markRaw, watchEffect } from 'vue';

import { env } from '@/lib/env';
import type Runtime from '@/lib/runtimes/Runtime';

import Service from './AI.state';

export class AIService extends Service {
  public _runtime: Runtime | null = null;

  public async updateChat(chatUrl: AnimaChat['url'], updates: Partial<AnimaChatEditableFields>): Promise<void> {
    const originalChat = this.chats[chatUrl];

    if (!originalChat) {
      return;
    }

    try {
      this.chats[chatUrl] = {
        ...originalChat,
        anima: { ...originalChat.anima, ...updates, updatedAt: new Date() },
      };

      await this.requiredRuntime().updateChat(chatUrl, updates);
    } catch (error) {
      this.chats[chatUrl] = originalChat;

      throw error;
    }
  }

  public async sendMessage(chatUrl: AnimaChat['url'], message: string): Promise<void> {
    const aiChat = this.chats[chatUrl]?.ai;

    if (!aiChat) {
      throw new Error(`Chat ${chatUrl} not found`);
    }

    await this.requiredRuntime().sendMessage(aiChat, message);
  }

  public async createChat(attributes: AnimaChatEditableFields): Promise<AnimaChat> {
    const animaChat = await this.requiredRuntime().createAnimaChat(attributes);
    const aiChat = await this.requiredRuntime().createAIChat(animaChat, { loadMessages: false });

    this.chats[animaChat.url] = { anima: animaChat, ai: markRaw(aiChat) };

    return animaChat;
  }

  async installModel(
    provider: ProviderName,
    name: ModelName,
    data: ModelMetadataEditableFields = { enabled: true },
  ): Promise<void> {
    this.models[`${provider}-${name}`] = await this.requiredRuntime().installModel(provider, name, data);
  }

  async refreshModels(): Promise<void> {
    const models = await this.requiredRuntime().getModels();

    this.models = objectFromEntries(models.map((model) => [`${model.provider}-${model.name}`, model]));
  }

  async updateModel(
    provider: ProviderName,
    name: ModelName,
    updates: Partial<ModelMetadataEditableFields>,
  ): Promise<void> {
    const key = `${provider}-${name}` as const;
    const originalModel = this.models[key];

    if (!originalModel) {
      return;
    }

    try {
      this.models[key] = { ...originalModel, ...updates } as AIModel;

      await this.requiredRuntime().updateModel(provider, name, updates);
    } catch (error) {
      this.models[key] = originalModel;

      throw error;
    }
  }

  async deleteModel(provider: ProviderName, name: ModelName): Promise<void> {
    const key = `${provider}-${name}` as const;
    const originalModel = this.models[key];

    if (!originalModel) {
      return;
    }

    try {
      delete this.models[key];

      await this.requiredRuntime().deleteModel(provider, name);
    } catch (error) {
      this.models[key] = originalModel;

      throw error;
    }
  }

  async cancelInstallation(provider: ProviderName, name: ModelName): Promise<void> {
    await this.requiredRuntime().cancelModelInstallation(provider, name);
  }

  protected async boot(): Promise<void> {
    await Solid.booted;
    await this.initializeRuntime();
    await this.watchSelectedChat();
    await this.watchLogout();
  }

  protected async initializeRuntime(): Promise<void> {
    const { default: Runtime } = env('VITE_SPA_MODE')
      ? await import('@/lib/runtimes/LocalRuntime')
      : await import('@/lib/runtimes/RemoteRuntime');

    this._runtime = new Runtime();

    const { chats, models, providers } = await this._runtime.initialize();

    this.chats = objectFromEntries(chats.map((chat) => [chat.url, { anima: chat }]));
    this.models = objectFromEntries(models.map((model) => [`${model.provider}-${model.name}`, model]));
    this.providersList = providers;

    if (!this.selectedModelKey || !(this.selectedModelKey in this.models)) {
      this.selectedModelKey = objectKeys(this.models)[0] ?? this.selectedModelKey;
    }
  }

  protected async watchSelectedChat(): Promise<void> {
    watchEffect(async () => {
      const selectedChat = this.selectedChatUrl && this.chats[this.selectedChatUrl];

      if (!selectedChat || selectedChat.ai) {
        return;
      }

      const aiChat = await this.requiredRuntime().createAIChat(selectedChat.anima, { loadMessages: true });

      this.chats[selectedChat.anima.url] = { ...selectedChat, ai: markRaw(aiChat) };
    });
  }

  protected async watchLogout(): Promise<void> {
    Events.on('auth:logout', () => Router.push({ name: 'home' }));
  }

  protected requiredRuntime(): Runtime {
    return this._runtime ?? fail('Runtime not initialized');
  }
}

export default facade(AIService);
