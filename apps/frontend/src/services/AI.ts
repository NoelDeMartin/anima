import { Solid } from '@aerogel/plugin-solid';
import type { Chat } from '@ai-sdk/vue';
import type { AIModel, UIMessage, ModelData, ModelName, ProviderName } from '@anima/core';
import { facade, fail, objectFromEntries, objectKeys } from '@noeldemartin/utils';

import { env } from '@/lib/env';
import type Runtime from '@/lib/runtimes/Runtime';

import Service from './AI.state';

export class AIService extends Service {
  public _runtime: Runtime | null = null;

  public newChat(): Chat<UIMessage> {
    return this.requiredRuntime().createChat();
  }

  public sendMessage(chat: Chat<UIMessage>, message: string): Promise<void> {
    return this.requiredRuntime().sendMessage(chat, message);
  }

  async installModel(provider: ProviderName, name: ModelName, data: ModelData = { enabled: true }): Promise<void> {
    this.models[`${provider}-${name}`] = await this.requiredRuntime().installModel(provider, name, data);
  }

  async refreshModels(): Promise<void> {
    const models = await this.requiredRuntime().getModels();

    this.models = objectFromEntries(models.map((model) => [`${model.provider}-${model.name}`, model]));
  }

  async updateModel(provider: ProviderName, name: ModelName, updates: Partial<ModelData>): Promise<void> {
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

    const { models, providers } = await this.initializeRuntime();

    this.models = objectFromEntries(models.map((model) => [`${model.provider}-${model.name}`, model]));
    this.providers = providers;

    if (!this.selectedModelKey || !(this.selectedModelKey in this.models)) {
      this.selectedModelKey = objectKeys(this.models)[0] ?? this.selectedModelKey;
    }
  }

  protected async initializeRuntime(): Promise<{ models: AIModel[]; providers: ProviderName[] }> {
    const { default: Runtime } = env('VITE_SPA_MODE')
      ? await import('@/lib/runtimes/LocalRuntime')
      : await import('@/lib/runtimes/RemoteRuntime');

    this._runtime = new Runtime();

    return this._runtime.initialize();
  }

  protected requiredRuntime(): Runtime {
    return this._runtime ?? fail('Runtime not initialized');
  }
}

export default facade(AIService);
