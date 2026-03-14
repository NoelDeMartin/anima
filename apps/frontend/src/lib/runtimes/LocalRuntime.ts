import { Events } from '@aerogel/core';
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
  messagesIdGenerator,
  AnthropicModelsProvider,
  OpenAIModelsProvider,
  type AIProvider,
  OtherModelsProvider,
  modelsStorage,
} from '@anima/core';
import { fail, objectKeys } from '@noeldemartin/utils';
import { DirectChatTransport, stepCountIs, ToolLoopAgent, type Tool } from 'ai';
import { toRaw } from 'vue';

import BrowserModelsProvider from '@/lib/providers/BrowserModelsProvider';
import IndexedDBModelsStorageProvider from '@/lib/providers/IndexedDBModelsStorageProvider';
import SolidAuthProvider from '@/lib/providers/SolidAuthProvider';
import AI from '@/services/AI';
import Browser from '@/services/Browser';

import type Runtime from './Runtime';

export default class LocalRuntime implements Runtime {
  async initialize(): Promise<{
    chats: AnimaChat[];
    models: AIModel[];
    providers: AIProvider[];
  }> {
    await Browser.booted;
    await Solid.booted;

    Events.on('auth:logout', () => modelsStorage().clear());

    bootAnimaModels();
    setAuthProvider(new SolidAuthProvider());
    setModelsStorageProvider(new IndexedDBModelsStorageProvider());

    await ModelsManager.registerProvider('browser' as ProviderName, new BrowserModelsProvider());
    await ModelsManager.registerProvider('ollama' as ProviderName, new OllamaModelsProvider('browser'));
    await ModelsManager.registerProvider('anthropic' as ProviderName, new AnthropicModelsProvider());
    await ModelsManager.registerProvider('google' as ProviderName, new GoogleModelsProvider());
    await ModelsManager.registerProvider('openai' as ProviderName, new OpenAIModelsProvider());
    await ModelsManager.registerProvider('other' as ProviderName, new OtherModelsProvider());

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

  async getProviders(): Promise<AIProvider[]> {
    return ModelsManager.getProviders();
  }

  async createAnimaChat(data: AnimaChatEditableFields): Promise<AnimaChat> {
    const chat = await ChatsManager.createChat(data);

    return chat;
  }

  async createAIChat(chat: AnimaChat, options: { loadMessages: boolean }): Promise<Chat<AnimaUIMessage>> {
    const messages = options.loadMessages ? await ChatsManager.getChatMessages(chat) : [];
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
      id: chat.url,
      messages,
      generateId: messagesIdGenerator(chat.url),
      transport: new DirectChatTransport({
        agent,
        originalMessages: messages,
        generateMessageId: messagesIdGenerator(chat.url),
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
            await ChatsManager.storeChatMessage(toRaw(message));

            messagesMap.set(message.id, message);
          }),
        );

        await ChatsManager.updateChat(chat.url, {});
      },
    });
  }

  updateChat(url: AnimaChat['url'], updates: Partial<AnimaChatEditableFields>): Promise<void> {
    return ChatsManager.updateChat(url, updates);
  }

  sendMessage(chat: Chat<AnimaUIMessage>, message: string): Promise<void> {
    return chat.sendMessage({
      text: message,
      metadata: { createdAt: new Date() },
    });
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
