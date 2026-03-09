import type { ModelName, ModelsProvider, ProviderModel, ProviderOptions } from '@anima/core';
import { isDevelopment, objectEntries } from '@noeldemartin/utils';
import type { LanguageModel } from 'ai';
import type { Ollama as OllamaServer } from 'ollama';
import type { Ollama as OllamaBrowser } from 'ollama/browser';

interface OngoingInstall {
  progress: number;
  stream?: { abort: () => void };
}

export default class OllamaModelsProvider implements ModelsProvider {
  private ongoingInstalls: Record<ModelName, OngoingInstall> = {};
  private runtime: 'browser' | 'server';

  constructor(runtime: 'browser' | 'server') {
    this.runtime = runtime;
  }

  public async isSupported(): Promise<boolean> {
    try {
      const response = await fetch('http://127.0.0.1:11434/api/version');
      const data = await response.json();

      return typeof data === 'object' && data !== null && 'version' in data;
    } catch (error) {
      if (isDevelopment()) {
        console.error(error);
      }

      return false;
    }
  }

  public async getModels(): Promise<ProviderModel[]> {
    const installedModels = await this.getInstalledModels();

    return ([] as ProviderModel[]).concat(installedModels.map((name) => ({ name, status: 'installed' }))).concat(
      objectEntries(this.ongoingInstalls).map(([name, install]) => ({
        name,
        status: 'installing',
        progress: install.progress,
      })),
    );
  }

  public async installModel(name: ModelName): Promise<ProviderModel> {
    if (name in this.ongoingInstalls || (await this.getInstalledModels()).includes(name)) {
      throw new Error(`Model '${name}' already installed`);
    }

    this.backgroundInstall(name);

    return { name, status: 'installing', progress: 0 };
  }

  public async deleteModel(name: ModelName): Promise<void> {
    const client = await this.getClient();

    await client.delete({ model: name });
  }

  public async cancelModelInstallation(name: ModelName): Promise<void> {
    this.ongoingInstalls[name]?.stream?.abort();

    delete this.ongoingInstalls[name];
  }

  public async createLanguageModel(
    name: ModelName,
  ): Promise<{ model: LanguageModel; supportsTools: boolean; providerOptions: ProviderOptions }> {
    const { ollama } = await import('ollama-ai-provider-v2');

    return {
      supportsTools: true,
      model: ollama(name),
      providerOptions: { ollama: { think: false } },
    };
  }

  private async getClient(): Promise<OllamaServer | OllamaBrowser> {
    const { default: client } = this.runtime === 'browser' ? await import('ollama/browser') : await import('ollama');

    return client;
  }

  private async getInstalledModels(): Promise<ModelName[]> {
    const client = await this.getClient();
    const response = await client.list();

    return response.models.map((model) => model.name as ModelName);
  }

  protected async backgroundInstall(name: ModelName): Promise<void> {
    try {
      const install: OngoingInstall = (this.ongoingInstalls[name] = { progress: 0 });
      const client = await this.getClient();
      const stream = await client.pull({ model: name, stream: true });

      install.stream = stream;

      for await (const part of stream) {
        if (!part.total || !part.completed) {
          continue;
        }

        install.progress = Math.round((part.completed / part.total) * 100);
      }
    } finally {
      delete this.ongoingInstalls[name];
    }
  }
}
