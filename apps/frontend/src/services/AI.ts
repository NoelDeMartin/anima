import { Solid } from '@aerogel/plugin-solid';
import type { Chat } from '@ai-sdk/vue';
import type {
  AIModel,
  AnimaUIMessage,
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

const NEW_CHAT_ID = 'new-chat' as const;

export class AIService extends Service {
  public _runtime: Runtime | null = null;

  public async startChat(): Promise<void> {
    this.selectedChatId = null;
  }

  public async selectChat(chatId: AnimaChat['id']): Promise<Chat<AnimaUIMessage>> {
    if (this.chat?.id === chatId) {
      return this.chat;
    }

    const chat = this.chats[chatId];

    if (!chat) {
      throw new Error(`Chat ${chatId} not found`);
    }

    const aiChat = markRaw(await this.requiredRuntime().restoreChat(chat));

    this.setState({
      chat: aiChat,
      selectedChatId: chat.id,
    });

    return aiChat;
  }

  public async updateChat(id: AnimaChat['id'], updates: Partial<AnimaChatEditableFields>): Promise<void> {
    const originalChat = this.chats[id];

    if (!originalChat) {
      return;
    }

    try {
      this.chats[id] = { ...originalChat, ...updates, updatedAt: new Date() } as AnimaChat;

      await this.requiredRuntime().updateChat(id, updates);
    } catch (error) {
      this.chats[id] = originalChat;

      throw error;
    }
  }

  public async sendMessage(chat: Chat<AnimaUIMessage>, message: string): Promise<void> {
    const resolvedChat = await this.resolveChat(chat);

    this.chats = { [resolvedChat.id]: { ...resolvedChat, updatedAt: new Date() }, ...this.chats };

    await this.requiredRuntime().sendMessage(resolvedChat, message);
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
  }

  protected async initializeRuntime(): Promise<void> {
    const { default: Runtime } = env('VITE_SPA_MODE')
      ? await import('@/lib/runtimes/LocalRuntime')
      : await import('@/lib/runtimes/RemoteRuntime');

    this._runtime = new Runtime();

    const { chats, models, providers } = await this._runtime.initialize();

    this.chats = objectFromEntries(chats.map((chat) => [chat.id, chat]));
    this.models = objectFromEntries(models.map((model) => [`${model.provider}-${model.name}`, model]));
    this.providers = providers;

    if (!this.selectedModelKey || !(this.selectedModelKey in this.models)) {
      this.selectedModelKey = objectKeys(this.models)[0] ?? this.selectedModelKey;
    }

    if (!this.selectedChatId || !(this.selectedChatId in this.chats)) {
      this.selectedChatId = this.chatsList[0]?.id ?? null;
    }
  }

  protected async watchSelectedChat(): Promise<void> {
    watchEffect(async () => {
      if (!this.selectedChatId) {
        this.chat = markRaw({ id: NEW_CHAT_ID, status: 'ready', messages: [] } as unknown as Chat<AnimaUIMessage>);

        return;
      }

      await this.selectChat(this.selectedChatId);
    });
  }

  protected async resolveChat(chat: Chat<AnimaUIMessage>): Promise<Chat<AnimaUIMessage>> {
    if (chat.id !== NEW_CHAT_ID) {
      return chat;
    }

    const title = new Date().toLocaleString();
    const newChat = await this.requiredRuntime().createChat({ title });
    const aiChat = markRaw(await this.requiredRuntime().restoreChat(newChat));

    this.setState({
      chat: aiChat,
      chats: { ...this.chats, [newChat.id]: newChat },
      selectedChatId: newChat.id,
    });

    return aiChat;
  }

  protected requiredRuntime(): Runtime {
    return this._runtime ?? fail('Runtime not initialized');
  }
}

export default facade(AIService);
