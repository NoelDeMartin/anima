import { Solid } from '@aerogel/plugin-solid';
import { Chat } from '@ai-sdk/vue';
import {
  GoogleModelsProvider,
  ModelsManager,
  systemPrompt,
  type AIModel,
  type ModelData,
  type ModelName,
  type ProviderName,
  type UIMessage,
} from '@anima/core';
import { fail } from '@noeldemartin/utils';
import { DirectChatTransport, stepCountIs, ToolLoopAgent, type Tool } from 'ai';

import AI from '@/services/AI';

import type Runtime from './Runtime';

export class LocalRuntime implements Runtime {
  async initialize(): Promise<{ models: AIModel[]; providers: ProviderName[] }> {
    ModelsManager.registerProvider('google' as ProviderName, new GoogleModelsProvider());

    return { models: await this.getModels(), providers: await this.getProviders() };
  }

  createChat(): Chat<UIMessage> {
    const agent = new ToolLoopAgent<never, Record<string, Tool>, never>({
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

        return {
          system: systemPrompt(Solid.requireUser()),
          model: await ModelsManager.createLanguageModel(AI.selectedModel.provider, AI.selectedModel.name),
          providerOptions: ModelsManager.getProviderOptions(AI.selectedModel.provider, AI.selectedModel.name),
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
