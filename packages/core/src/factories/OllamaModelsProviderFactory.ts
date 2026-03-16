import type { ModelsProviderFactory, ProviderOptions, InstallingModel, AIProvider } from '@anima/core';
import type { ModelId, ProviderId } from '@anima/core';
import { objectEntries, required } from '@noeldemartin/utils';
import type { LanguageModel } from 'ai';

interface OngoingInstall {
  model: InstallingModel;
  stream?: { abort: () => void };
  onInstalled: () => Promise<void>;
}

export default class OllamaModelsProviderFactory implements ModelsProviderFactory {
  private runtime: 'browser' | 'server';
  private ongoingInstalls: Record<`${ProviderId}-${ModelId}`, OngoingInstall> = {};

  constructor(runtime: 'browser' | 'server') {
    this.runtime = runtime;
  }

  async requiresUrl(): Promise<boolean> {
    return true;
  }

  async getPreinstalledModels(provider: AIProvider): Promise<string[]> {
    return this.getInstalledModelNames(provider);
  }

  public async getInstallingModels(provider: AIProvider): Promise<InstallingModel[]> {
    return objectEntries(this.ongoingInstalls)
      .filter(([key]) => key.startsWith(`${provider.id}-`))
      .map(([_, install]) => install.model);
  }

  public async installModel(
    provider: AIProvider,
    id: ModelId,
    name: string,
    options: { onInstalled: () => Promise<void> },
  ): Promise<InstallingModel> {
    const key = `${provider.id}-${id}`;

    if (key in this.ongoingInstalls || (await this.getInstalledModelNames(provider)).includes(name)) {
      throw new Error(`Model '${name}' already installed`);
    }

    const model: InstallingModel = { id, providerId: provider.id, name, progress: 0 };

    this.backgroundInstall(provider, id, model, options.onInstalled);

    return model;
  }

  public async uninstallModel(provider: AIProvider, name: string): Promise<void> {
    const client = await this.getClient(provider);

    await client.delete({ model: name });
  }

  public async cancelModelInstallation(provider: AIProvider, id: ModelId): Promise<void> {
    const key = `${provider.id}-${id}` as const;

    this.ongoingInstalls[key]?.stream?.abort();

    delete this.ongoingInstalls[key];
  }

  public async createLanguageModel(
    provider: AIProvider,
    name: string,
  ): Promise<{ languageModel: LanguageModel; supportsTools: boolean; providerOptions: ProviderOptions }> {
    const { createOllama } = await import('ollama-ai-provider-v2');
    const ollama = createOllama({ baseURL: `${provider.url}/api` });

    return {
      supportsTools: true,
      languageModel: ollama(name),
      providerOptions: { ollama: { think: false } },
    };
  }

  private async getClient(provider: AIProvider) {
    const { Ollama } = this.runtime === 'browser' ? await import('ollama/browser') : await import('ollama');

    return new Ollama({ host: required(provider.url) });
  }

  private async getInstalledModelNames(provider: AIProvider): Promise<string[]> {
    const client = await this.getClient(provider);
    const response = await client.list();

    return response.models.map((model) => model.name);
  }

  protected async backgroundInstall(
    provider: AIProvider,
    id: ModelId,
    model: InstallingModel,
    onInstalled: () => Promise<void>,
  ): Promise<void> {
    const key = `${provider.id}-${id}` as const;

    try {
      const install: OngoingInstall = (this.ongoingInstalls[key] = { model, onInstalled });
      const client = await this.getClient(provider);
      const stream = await client.pull({ model: model.name, stream: true });

      install.stream = stream;

      for await (const part of stream) {
        if (!part.total || !part.completed) {
          continue;
        }

        install.model.progress = Math.round((part.completed / part.total) * 100);
      }

      await onInstalled();
    } finally {
      delete this.ongoingInstalls[key];
    }
  }
}
