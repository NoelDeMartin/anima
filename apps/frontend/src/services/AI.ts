import { Events } from '@aerogel/core';
import { Router } from '@aerogel/plugin-routing';
import { Solid } from '@aerogel/plugin-solid';
import type {
  AIProvider,
  AIProviderEditableFields,
  ProviderId,
  ModelId,
  AnimaChat,
  AnimaChatEditableFields,
  InstalledModelEditableFields,
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
    providerId: ProviderId,
    name: string,
    data: InstalledModelEditableFields = { enabled: true, alias: null },
  ): Promise<void> {
    const model = await this.requiredRuntime().installModel(providerId, name, data);

    this.models[model.id] = model;
  }

  async refreshModels(): Promise<void> {
    const models = await this.requiredRuntime().getModels();

    this.models = objectFromEntries(models.map((model) => [model.id, model]));
  }

  async updateModel(id: ModelId, updates: Partial<InstalledModelEditableFields>): Promise<void> {
    const originalModel = this.models[id];

    if (!originalModel) {
      return;
    }

    try {
      this.models[id] = { ...originalModel, ...updates };

      await this.requiredRuntime().updateModel(id, updates);
    } catch (error) {
      this.models[id] = originalModel;

      throw error;
    }
  }

  async deleteModel(id: ModelId): Promise<void> {
    const originalModel = this.models[id];

    if (!originalModel) {
      return;
    }

    try {
      delete this.models[id];

      await this.requiredRuntime().deleteModel(id);
    } catch (error) {
      this.models[id] = originalModel;

      throw error;
    }
  }

  async cancelInstallation(providerId: ProviderId, id: ModelId): Promise<void> {
    await this.requiredRuntime().cancelModelInstallation(providerId, id);
  }

  async createProvider(provider: Omit<AIProvider, 'id'>): Promise<void> {
    await this.requiredRuntime().createProvider(provider);

    const providersList = await this.requiredRuntime().getProviders();
    const models = await this.requiredRuntime().getModels();

    this.setState({
      providersList,
      models: objectFromEntries(models.map((model) => [model.id, model])),
    });
  }

  async updateProvider(id: ProviderId, updates: Partial<AIProviderEditableFields>): Promise<void> {
    await this.requiredRuntime().updateProvider(id, updates);

    this.providersList = await this.requiredRuntime().getProviders();
  }

  async deleteProvider(id: ProviderId): Promise<void> {
    await this.requiredRuntime().deleteProvider(id);

    const providers = await this.requiredRuntime().getProviders();
    const models = await this.requiredRuntime().getModels();

    this.setState({
      providersList: providers,
      models: objectFromEntries(models.map((model) => [model.id, model])),
    });
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

    const { chats, models, providers, factories } = await this._runtime.initialize();

    this.setState({
      chats: objectFromEntries(chats.map((chat) => [chat.url, { anima: chat }])),
      models: objectFromEntries(models.map((model) => [model.id, model])),
      providersList: providers,
      providerFactoriesList: factories,
    });

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
