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
import { facade, objectFromEntries, objectKeys } from '@noeldemartin/utils';
import { markRaw, watchEffect } from 'vue';

import { getRuntime, requireRuntime } from '@/lib/runtime';

import Service from './AI.state';

export class AIService extends Service {
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

      await requireRuntime().updateChat(chatUrl, updates);
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

    await requireRuntime().sendMessage(aiChat, message);
  }

  public async createChat(attributes: AnimaChatEditableFields): Promise<AnimaChat> {
    const animaChat = await requireRuntime().createAnimaChat(attributes);
    const aiChat = await requireRuntime().createAIChat(animaChat, { loadMessages: false });

    this.chats[animaChat.url] = { anima: animaChat, ai: markRaw(aiChat) };

    return animaChat;
  }

  async installModel(
    providerId: ProviderId,
    name: string,
    data: InstalledModelEditableFields = { enabled: true, alias: null },
  ): Promise<void> {
    const model = await requireRuntime().installModel(providerId, name, data);

    this.models[model.id] = model;
  }

  async refreshModels(): Promise<void> {
    const models = await requireRuntime().getModels();

    this.models = objectFromEntries(models.map((model) => [model.id, model]));
  }

  async updateModel(id: ModelId, updates: Partial<InstalledModelEditableFields>): Promise<void> {
    const originalModel = this.models[id];

    if (!originalModel) {
      return;
    }

    try {
      this.models[id] = { ...originalModel, ...updates };

      await requireRuntime().updateModel(id, updates);
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

      await requireRuntime().deleteModel(id);
    } catch (error) {
      this.models[id] = originalModel;

      throw error;
    }
  }

  async cancelInstallation(providerId: ProviderId, id: ModelId): Promise<void> {
    await requireRuntime().cancelModelInstallation(providerId, id);
  }

  async createProvider(provider: Omit<AIProvider, 'id'>): Promise<void> {
    await requireRuntime().createProvider(provider);

    const providersList = await requireRuntime().getProviders();
    const models = await requireRuntime().getModels();

    this.setState({
      providersList,
      models: objectFromEntries(models.map((model) => [model.id, model])),
    });
  }

  async updateProvider(id: ProviderId, updates: Partial<AIProviderEditableFields>): Promise<void> {
    await requireRuntime().updateProvider(id, updates);

    this.providersList = await requireRuntime().getProviders();
  }

  async deleteProvider(id: ProviderId): Promise<void> {
    await requireRuntime().deleteProvider(id);

    const providers = await requireRuntime().getProviders();
    const models = await requireRuntime().getModels();

    this.setState({
      providersList: providers,
      models: objectFromEntries(models.map((model) => [model.id, model])),
    });
  }

  protected async boot(): Promise<void> {
    await Solid.booted;
    await this.initializeRuntime();
    await this.watchSelectedChat();
    await this.watchSelectedModel();
    await this.watchLogin();
    await this.watchLogout();
  }

  protected async initializeRuntime(): Promise<void> {
    const runtime = await getRuntime({ skipInitialization: true });
    const { chats, models, providers, factories } = await runtime.initialize();

    this.setState({
      chats: objectFromEntries(chats.map((chat) => [chat.url, { anima: chat }])),
      models: objectFromEntries(models.map((model) => [model.id, model])),
      providersList: providers,
      providerFactoriesList: factories,
    });
  }

  protected async watchSelectedChat(): Promise<void> {
    watchEffect(async () => {
      const selectedChat = this.selectedChatUrl && this.chats[this.selectedChatUrl];

      if (!selectedChat || selectedChat.ai) {
        return;
      }

      const aiChat = await requireRuntime().createAIChat(selectedChat.anima, { loadMessages: true });

      this.chats[selectedChat.anima.url] = { ...selectedChat, ai: markRaw(aiChat) };
    });
  }

  protected async watchSelectedModel(): Promise<void> {
    watchEffect(() => {
      if (this.selectedModelKey && this.selectedModelKey in this.models) {
        return;
      }

      this.selectedModelKey = objectKeys(this.models)[0] ?? this.selectedModelKey;
    });
  }

  protected async watchLogin(): Promise<void> {
    Events.on('auth:login', async () => {
      if (this.providersList.length > 0) {
        return;
      }

      await this.initializeRuntime();
    });
  }

  protected async watchLogout(): Promise<void> {
    Events.on('auth:logout', () => Router.push({ name: 'home' }));
  }
}

export default facade(AIService);
