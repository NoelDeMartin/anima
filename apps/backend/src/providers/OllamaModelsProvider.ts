import type { ModelName, ModelsProvider, ProviderModel, ProviderOptions } from '@anima/core';
import { objectEntries } from '@noeldemartin/utils';
import type { LanguageModel } from 'ai';
import type { Ollama } from 'ollama';

interface OngoingInstall {
  progress: number;
  stream?: { abort: () => void };
}

export class OllamaModelsProvider implements ModelsProvider {
  private ongoingInstalls: Record<ModelName, OngoingInstall> = {};

  public async getModels(): Promise<ProviderModel[]> {
    const client = await this.getClient();
    const { models: installedModels } = await client.list();

    return ([] as ProviderModel[])
      .concat(installedModels.map((model) => ({ name: model.name as ModelName, status: 'installed' })))
      .concat(
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

  async deleteModel(name: ModelName): Promise<void> {
    const client = await this.getClient();

    await client.delete({ model: name });
  }

  public async cancelModelInstallation(name: ModelName): Promise<void> {
    this.ongoingInstalls[name]?.stream?.abort();

    delete this.ongoingInstalls[name];
  }

  public async createLanguageModel(name: ModelName): Promise<LanguageModel> {
    const { ollama } = await import('ollama-ai-provider-v2');

    return ollama(name);
  }

  getProviderOptions(): ProviderOptions {
    return { ollama: { think: false } };
  }

  private async getClient(): Promise<Ollama> {
    const { default: client } = await import('ollama');

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
