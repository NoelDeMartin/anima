import { Solid } from '@aerogel/plugin-solid';
import { Chat } from '@ai-sdk/vue';
import {
  GoogleModelsProvider,
  ModelsManager,
  OllamaModelsProvider,
  setAuthProvider,
  systemPrompt,
  tools,
  type AIModel,
  type AnimaChat,
  type AnimaChatEditableFields,
  type ModelMetadataEditableFields,
  type ModelName,
  type ProviderName,
  type AnimaUIMessage,
  ChatsManager,
  bootAnimaModels,
  setModelsStorageProvider,
} from '@anima/core';
import { fail, objectKeys } from '@noeldemartin/utils';
import { createIdGenerator, DirectChatTransport, stepCountIs, ToolLoopAgent, type Tool } from 'ai';
import { toRaw } from 'vue';

import BrowserModelsProvider from '@/lib/providers/BrowserModelsProvider';
import IndexedDBModelsStorageProvider from '@/lib/providers/IndexedDBModelsStorageProvider';
import SolidAuthProvider from '@/lib/providers/SolidAuthProvider';
import AI from '@/services/AI';
import Browser from '@/services/Browser';

import type Runtime from './Runtime';

export default class LocalRuntime implements Runtime {
  async initialize(): Promise<{ chats: AnimaChat[]; models: AIModel[]; providers: ProviderName[] }> {
    await Browser.booted;
    await Solid.booted;

    bootAnimaModels();
    setAuthProvider(new SolidAuthProvider());
    setModelsStorageProvider(new IndexedDBModelsStorageProvider());

    await Promise.all([
      ModelsManager.registerProvider('browser' as ProviderName, new BrowserModelsProvider()),
      ModelsManager.registerProvider('google' as ProviderName, new GoogleModelsProvider()),
      ModelsManager.registerProvider('ollama' as ProviderName, new OllamaModelsProvider('browser')),
    ]);

    if (!Solid.isLoggedIn()) {
      return { chats: [], models: [], providers: [] };
    }

    return {
      chats: await this.getChats(),
      models: await this.getModels(),
      providers: await this.getProviders(),
    };
  }

  async getChats(): Promise<AnimaChat[]> {
    return ChatsManager.getChats();
  }

  async getModels(): Promise<AIModel[]> {
    return ModelsManager.getModels();
  }

  async getProviders(): Promise<ProviderName[]> {
    return ModelsManager.getProviders();
  }

  async createChat(data: AnimaChatEditableFields): Promise<AnimaChat> {
    const chat = await ChatsManager.createChat(data);

    return chat;
  }

  async restoreChat(chat: AnimaChat): Promise<Chat<AnimaUIMessage>> {
    const messages = await ChatsManager.getChatMessages(chat);
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

    return new Chat<AnimaUIMessage>({
      id: chat.id,
      messages,
      transport: new DirectChatTransport({
        agent,
        originalMessages: messages,
        generateMessageId: createIdGenerator(),
        messageMetadata({ part }) {
          if (part.type !== 'start') {
            return;
          }

          return {
            model: AI.selectedModel?.name,
            provider: AI.selectedModel?.provider,
            createdAt: new Date(),
          };
        },
      }),
      async onFinish({ messages: allMessages }) {
        const newMessages = allMessages.filter((message) => !messagesMap.has(message.id));

        await Promise.all(
          newMessages.map(async (message) => {
            await ChatsManager.storeChatMessage(chat, toRaw(message));

            messagesMap.set(message.id, message);
          }),
        );

        await ChatsManager.updateChat(chat.id, {});
      },
    });
  }

  updateChat(id: AnimaChat['id'], updates: Partial<AnimaChatEditableFields>): Promise<void> {
    return ChatsManager.updateChat(id, updates);
  }

  sendMessage(chat: Chat<AnimaUIMessage>, message: string): Promise<void> {
    return chat.sendMessage({ text: message, metadata: { createdAt: new Date() } });
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
    await ModelsManager.upsertModel(provider, model, updates);
  }

  async deleteModel(provider: ProviderName, model: ModelName): Promise<void> {
    await ModelsManager.deleteModel(provider, model);
  }

  async cancelModelInstallation(provider: ProviderName, model: ModelName): Promise<void> {
    await ModelsManager.cancelModelInstallation(provider, model);
  }
}
