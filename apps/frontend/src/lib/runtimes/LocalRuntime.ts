import { Solid } from '@aerogel/plugin-solid';
import { Chat } from '@ai-sdk/vue';
import {
  GoogleModelsProvider,
  ModelsManager,
  setAuthProvider,
  systemPrompt,
  tools,
  type AIModel,
  type ModelData,
  type ModelName,
  type ProviderName,
  type UIMessage,
} from '@anima/core';
import { fail, objectKeys } from '@noeldemartin/utils';
import { DirectChatTransport, stepCountIs, ToolLoopAgent, type Tool } from 'ai';

import BrowserModelsProvider from '@/lib/providers/BrowserModelsProvider';
import AI from '@/services/AI';
import Browser from '@/services/Browser';

import type Runtime from './Runtime';

export default class LocalRuntime implements Runtime {
  async initialize(): Promise<{ models: AIModel[]; providers: ProviderName[] }> {
    await Browser.booted;

    await Promise.all([
      ModelsManager.registerProvider('google' as ProviderName, new GoogleModelsProvider()),
      Browser.promptAPIAvailable &&
        ModelsManager.registerProvider('browser' as ProviderName, new BrowserModelsProvider()),
    ]);

    setAuthProvider({
      getUser: () => Solid.requireUser(),
      fetch: (input: string, init?: RequestInit) => Solid.fetch(input, init),
    });

    return { models: await this.getModels(), providers: await this.getProviders() };
  }

  createChat(): Chat<UIMessage> {
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

    return new Chat({ transport: new DirectChatTransport({ agent }) });
  }

  sendMessage(chat: Chat<UIMessage>, message: string): Promise<void> {
    return chat.sendMessage({ text: message });
  }

  async getProviders(): Promise<ProviderName[]> {
    return ModelsManager.getProviders();
  }

  async getModels(): Promise<AIModel[]> {
    return ModelsManager.getModels();
  }

  async installModel(provider: ProviderName, model: ModelName, data: ModelData = { enabled: true }): Promise<AIModel> {
    return ModelsManager.installModel(provider, model, data);
  }

  async updateModel(provider: ProviderName, model: ModelName, updates: Partial<ModelData>): Promise<void> {
    await ModelsManager.updateModel(provider, model, updates);
  }

  async deleteModel(provider: ProviderName, model: ModelName): Promise<void> {
    await ModelsManager.deleteModel(provider, model);
  }

  async cancelModelInstallation(provider: ProviderName, model: ModelName): Promise<void> {
    await ModelsManager.cancelModelInstallation(provider, model);
  }
}
