import { Events } from '@aerogel/core';
import { Solid } from '@aerogel/plugin-solid';
import { Chat } from '@ai-sdk/vue';
import {
  ModelsManager,
  setAuthProvider,
  systemPrompt,
  tools,
  type AIModel,
  type AnimaChat,
  type AnimaChatEditableFields,
  type AnimaUIMessage,
  ChatsManager,
  bootAnimaModels,
  messagesIdGenerator,
  type ProviderType,
  AnthropicModelsProviderFactory,
  GoogleModelsProviderFactory,
  OpenAIModelsProviderFactory,
  OllamaModelsProviderFactory,
  type AIProvider,
  type ModelId,
  type ProviderId,
  type InstalledModelEditableFields,
  type AIProviderEditableFields,
  type AIProviderFactory,
  OtherModelsProviderFactory,
} from '@anima/core';
import { fail, objectKeys } from '@noeldemartin/utils';
import { DirectChatTransport, stepCountIs, ToolLoopAgent, type Tool } from 'ai';
import { toRaw } from 'vue';

import BrowserModelsProviderFactory from '@/lib/providers/BrowserModelsProviderFactory';
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
    factories: AIProviderFactory[];
  }> {
    await Browser.booted;
    await Solid.booted;

    const browserFactory = new BrowserModelsProviderFactory();

    Events.on('auth:logout', () => ModelsManager.clear());

    bootAnimaModels();
    setAuthProvider(new SolidAuthProvider());

    ModelsManager.setStorageProvider(new IndexedDBModelsStorageProvider());
    ModelsManager.registerFactory('browser' as ProviderType, browserFactory);
    ModelsManager.registerFactory('ollama' as ProviderType, new OllamaModelsProviderFactory('browser'));
    ModelsManager.registerFactory('anthropic' as ProviderType, new AnthropicModelsProviderFactory('browser'));
    ModelsManager.registerFactory('google' as ProviderType, new GoogleModelsProviderFactory('browser'));
    ModelsManager.registerFactory('openai' as ProviderType, new OpenAIModelsProviderFactory('browser'));
    ModelsManager.registerFactory('other' as ProviderType, new OtherModelsProviderFactory());

    if (!Solid.isLoggedIn()) {
      return { chats: [], models: [], providers: [], factories: [] };
    }

    const browserAvailability = await browserFactory.getAvailability();
    const result = {
      chats: await this.getChats(),
      models: await this.getModels(),
      providers: await this.getProviders(),
      factories: await ModelsManager.getProviderFactories(),
    };

    if (browserAvailability === 'available' && !result.providers.some((provider) => provider.type === 'browser')) {
      await this.createProvider({
        type: 'browser' as ProviderType,
        name: 'Browser',
      });

      result.models = await this.getModels();
      result.providers = await this.getProviders();
    }

    return result;
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

        const {
          languageModel: model,
          supportsTools,
          providerOptions,
        } = await ModelsManager.createLanguageModel(AI.selectedModel.id);

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
            provider: AI.selectedModel?.providerId && AI.providers[AI.selectedModel.providerId]?.type,
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
    providerId: ProviderId,
    name: string,
    data: InstalledModelEditableFields = { enabled: true, alias: null },
  ): Promise<AIModel> {
    return ModelsManager.createModel(providerId, name, data);
  }

  async updateModel(id: ModelId, updates: Partial<InstalledModelEditableFields>): Promise<void> {
    await ModelsManager.updateModel(id, updates);
  }

  async deleteModel(id: ModelId): Promise<void> {
    await ModelsManager.deleteModel(id);
  }

  async cancelModelInstallation(providerId: ProviderId, id: ModelId): Promise<void> {
    await ModelsManager.cancelModelInstallation(providerId, id);
  }

  async createProvider(provider: Omit<AIProvider, 'id'>): Promise<void> {
    await ModelsManager.createProvider(provider);
  }

  async updateProvider(id: ProviderId, updates: Partial<AIProviderEditableFields>): Promise<void> {
    await ModelsManager.updateProvider(id, updates);
  }

  async deleteProvider(id: ProviderId): Promise<void> {
    await ModelsManager.deleteProvider(id);
  }
}
