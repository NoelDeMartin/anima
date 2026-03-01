import type { Chat } from '@ai-sdk/vue';
import type { AIModel, UIMessage, ModelData, ModelName, ProviderName } from '@anima/core';
import { facade, objectFromEntries, objectKeys } from '@noeldemartin/utils';

import { env } from '@/lib/env';
import { LocalRuntime } from '@/lib/runtimes/LocalRuntime';
import { RemoteRuntime } from '@/lib/runtimes/RemoteRuntime';
import type Runtime from '@/lib/runtimes/Runtime';
import Auth from '@/services/Auth';

import Service from './AI.state';

export class AIService extends Service {
  public runtime: Runtime = env('VITE_SPA_MODE') ? new LocalRuntime() : new RemoteRuntime();

  public newChat(): Chat<UIMessage> {
    return this.runtime.createChat();
  }

  public sendMessage(chat: Chat<UIMessage>, message: string): Promise<void> {
    return this.runtime.sendMessage(chat, message);
  }

  async installModel(provider: ProviderName, name: ModelName, data: ModelData): Promise<void> {
    this.models[`${provider}-${name}`] = await this.runtime.installModel(provider, name, data);
  }

  async refreshModels(): Promise<void> {
    const models = await this.runtime.getModels();

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

      await this.runtime.updateModel(provider, name, updates);
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

      await this.runtime.deleteModel(provider, name);
    } catch (error) {
      this.models[key] = originalModel;

      throw error;
    }
  }

  async cancelInstallation(provider: ProviderName, name: ModelName): Promise<void> {
    await this.runtime.cancelModelInstallation(provider, name);
  }

  protected async boot(): Promise<void> {
    await Auth.booted;

    const { models, providers } = await this.runtime.initialize();

    this.models = objectFromEntries(models.map((model) => [`${model.provider}-${model.name}`, model]));
    this.providers = providers;

    if (!this.selectedModelKey || !(this.selectedModelKey in this.models)) {
      this.selectedModelKey = objectKeys(this.models)[0] ?? this.selectedModelKey;
    }
  }
}

export default facade(AIService);
