import { env, Events } from '@aerogel/core';
import { Solid } from '@aerogel/plugin-solid';
import {
  ModelsManager,
  setAuthProvider,
  systemPrompt,
  tools,
  type AIModel,
  type AnimaChatRecord,
  type AnimaChatEditableFields,
  ChatsManager,
  bootAnimaModels,
  messagesIdGenerator,
  getAIErrorMessage,
  type ProviderType,
  AnthropicModelsProviderFactory,
  GoogleModelsProviderFactory,
  OpenAIModelsProviderFactory,
  OpenCodeGoModelsProviderFactory,
  OllamaModelsProviderFactory,
  type AIProvider,
  type ModelId,
  type ProviderId,
  type InstalledModelEditableFields,
  type AIProviderEditableFields,
  OtherModelsProviderFactory,
  TestingModelsProviderFactory,
} from '@anima/core';
import { fail, objectKeys } from '@noeldemartin/utils';
import { stepCountIs, ToolLoopAgent, type Tool } from 'ai';

import AnimaChat from '@/lib/ai/AnimaChat';
import AnimaDirectChatTransport from '@/lib/ai/AnimaDirectChatTransport';
import BrowserModelsProviderFactory from '@/lib/providers/BrowserModelsProviderFactory';
import IndexedDBModelsStorageProvider from '@/lib/providers/IndexedDBModelsStorageProvider';
import SolidAuthProvider from '@/lib/providers/SolidAuthProvider';
import AI from '@/services/AI';
import BrowserAPIs from '@/services/BrowserAPIs';

import type { RuntimeInitializeResult } from './Runtime';
import Runtime from './Runtime';

export default class LocalRuntime extends Runtime {
  async isNative(): Promise<boolean> {
    return false;
  }

  async getChats(): Promise<AnimaChatRecord[]> {
    return ChatsManager.getChats();
  }

  async getModels(): Promise<AIModel[]> {
    return ModelsManager.getModels();
  }

  async getProviders(): Promise<AIProvider[]> {
    return ModelsManager.getProviders();
  }

  async createAnimaChat(data: AnimaChatEditableFields): Promise<AnimaChatRecord> {
    const chat = await ChatsManager.createChat(data);

    return chat;
  }

  async createAIChat(chat: AnimaChatRecord, options: { loadMessages: boolean }): Promise<AnimaChat> {
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

        const { languageModel: model, providerOptions } = await ModelsManager.createLanguageModel(AI.selectedModel.id);

        return {
          model,
          providerOptions,
          activeTools: AI.selectedModel.supportsTools ? objectKeys(tools) : [],
          system: systemPrompt({ user: Solid.requireUser(), supportsTools: AI.selectedModel.supportsTools }),
        };
      },
    });

    return new AnimaChat(chat, {
      messages,
      transport: new AnimaDirectChatTransport({
        agent,
        originalMessages: messages,
        generateMessageId: messagesIdGenerator(chat.url),
        onError: (error) => getAIErrorMessage(error),
        messageMetadata({ part }) {
          if (part.type !== 'start') {
            return;
          }

          return AI.createMessageMetadata();
        },
      }),
      async onFinish({ messages: allMessages }) {
        const newMessages = allMessages.filter((message) => !messagesMap.has(message.id));

        await Promise.all(
          newMessages.map(async (message) => {
            await ChatsManager.storeChatMessage(message);

            messagesMap.set(message.id, message);
          }),
        );

        await ChatsManager.updateChat(chat.url, {});
      },
    });
  }

  updateChat(url: AnimaChatRecord['url'], updates: Partial<AnimaChatEditableFields>): Promise<void> {
    return ChatsManager.updateChat(url, updates);
  }

  sendMessage(chat: AnimaChat, message: string): Promise<void> {
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

  protected async performInitialize(): Promise<RuntimeInitializeResult> {
    await BrowserAPIs.booted;
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
    ModelsManager.registerFactory('opencode-go' as ProviderType, new OpenCodeGoModelsProviderFactory('browser'));
    ModelsManager.registerFactory('other' as ProviderType, new OtherModelsProviderFactory());

    if (env('VITE_E2E')) {
      ModelsManager.registerFactory('testing' as ProviderType, new TestingModelsProviderFactory());
    }

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

    if (browserAvailability === 'available') {
      await this.ensureProvider(result, 'browser' as ProviderType, 'Browser');
    }

    if (env('VITE_E2E')) {
      await this.ensureProvider(result, 'testing' as ProviderType, 'Testing');
    }

    return result;
  }

  private async ensureProvider(result: RuntimeInitializeResult, type: ProviderType, name: string): Promise<void> {
    if (result.providers.some((provider) => provider.type === type)) {
      return;
    }

    await this.createProvider({ type, name });

    result.models = await this.getModels();
    result.providers = await this.getProviders();
  }
}
