import { Solid } from '@aerogel/plugin-solid';
import { Chat } from '@ai-sdk/vue';
import {
  GoogleModelsProvider,
  ModelsManager,
  setAuthProvider,
  setStorageProvider,
  storage,
  systemPrompt,
  tools,
  type AIModel,
  type AnimaChat,
  type AnimaChatEditableFields,
  type ModelMetadataEditableFields,
  type ModelName,
  type ProviderName,
  type UIMessage,
} from '@anima/core';
import { fail, objectKeys } from '@noeldemartin/utils';
import { DirectChatTransport, stepCountIs, ToolLoopAgent, type Tool } from 'ai';
import { toRaw } from 'vue';

import BrowserModelsProvider from '@/lib/providers/BrowserModelsProvider';
import IndexedDBStorageProvider from '@/lib/providers/IndexedDBStorageProvider';
import SolidAuthProvider from '@/lib/providers/SolidAuthProvider';
import AI from '@/services/AI';
import Browser from '@/services/Browser';

import type Runtime from './Runtime';

export default class LocalRuntime implements Runtime {
  async initialize(): Promise<{ chats: AnimaChat[]; models: AIModel[]; providers: ProviderName[] }> {
    await Browser.booted;

    setAuthProvider(new SolidAuthProvider());
    setStorageProvider(new IndexedDBStorageProvider());

    await Promise.all([
      ModelsManager.registerProvider('google' as ProviderName, new GoogleModelsProvider()),
      Browser.promptAPIAvailable &&
        ModelsManager.registerProvider('browser' as ProviderName, new BrowserModelsProvider()),
    ]);

    return {
      chats: await this.getChats(),
      models: await this.getModels(),
      providers: await this.getProviders(),
    };
  }

  async getChats(): Promise<AnimaChat[]> {
    return storage().getChats();
  }

  async getModels(): Promise<AIModel[]> {
    return ModelsManager.getModels();
  }

  async getProviders(): Promise<ProviderName[]> {
    return ModelsManager.getProviders();
  }

  async createChat(data: AnimaChatEditableFields): Promise<AnimaChat> {
    const chat = await storage().createChat(data);

    return chat;
  }

  async restoreChat(chat: AnimaChat): Promise<Chat<UIMessage>> {
    const messages = await storage().getChatMessages(chat);
    const messagesMap = new Map(messages.map((message) => [message.id, message]));
    const agent = new ToolLoopAgent<never, Record<string, Tool>, never>({
      tools,
      model: {
        specificationVersion: 'v3',
        provider: 'noop',
        modelId: 'noop',
        supportedUrls: {},
        doGenerate: () => fail("Can't use NOOP model"),
        doStream: () => fail("Can't use NOOP model"),
      },
      stopWhen: stepCountIs(10),
      async prepareStep() {
        if (!AI.selectedModel) {
          throw new Error('No selected model');
        }

        const { model, supportsTools, providerOptions } = await ModelsManager.createLanguageModel(
          AI.selectedModel.provider,
          AI.selectedModel.name,
        );

        return {
          model,
          providerOptions,
          activeTools: supportsTools ? objectKeys(tools) : [],
          system: systemPrompt(Solid.requireUser()),
        };
      },
    });

    return new Chat<UIMessage>({
      id: chat.id,
      messages,
      transport: new DirectChatTransport({ agent }),
      onFinish: async ({ messages: allMessages }) => {
        const newMessages = allMessages.filter((message) => !messagesMap.has(message.id));

        await Promise.all(
          newMessages.map(async (message) => {
            await storage().storeChatMessage(chat, toRaw(message));

            messagesMap.set(message.id, message);
          }),
        );
      },
    });
  }

  updateChat(id: AnimaChat['id'], updates: AnimaChatEditableFields): Promise<void> {
    return storage().updateChat(id, updates);
  }

  sendMessage(chat: Chat<UIMessage>, message: string): Promise<void> {
    return chat.sendMessage({ text: message });
  }

  async installModel(
    provider: ProviderName,
    model: ModelName,
    data: ModelMetadataEditableFields = { enabled: true },
  ): Promise<AIModel> {
    return ModelsManager.installModel(provider, model, data);
  }

  async updateModel(
    provider: ProviderName,
    model: ModelName,
    updates: Partial<ModelMetadataEditableFields>,
  ): Promise<void> {
    await ModelsManager.updateModel(provider, model, updates);
  }

  async deleteModel(provider: ProviderName, model: ModelName): Promise<void> {
    await ModelsManager.deleteModel(provider, model);
  }

  async cancelModelInstallation(provider: ProviderName, model: ModelName): Promise<void> {
    await ModelsManager.cancelModelInstallation(provider, model);
  }
}
