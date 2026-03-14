import type { ModelMetadata, ModelName, ModelsProvider, ProviderModel, ProviderOptions } from '@anima/core';
import type { Nullable } from '@noeldemartin/utils';
import type { LanguageModel } from 'ai';

export default abstract class APIModelsProvider implements ModelsProvider {
  private installedModels: Set<ModelName> = new Set();

  async requiresAPIKey(): Promise<boolean> {
    return true;
  }

  async getModels(): Promise<ProviderModel[]> {
    return Array.from(this.installedModels).map((name) => ({ name, status: 'installed' }));
  }

  async installModel(name: ModelName): Promise<ProviderModel> {
    this.installedModels.add(name);

    return { name, status: 'installed' };
  }

  async deleteModel(name: ModelName): Promise<void> {
    this.installedModels.delete(name);
  }

  async cancelModelInstallation(): Promise<void> {
    // Nothing to do here, API models are installed instantly.
  }

  abstract createLanguageModel(
    name: ModelName,
    data: Nullable<ModelMetadata>,
  ): Promise<{ model: LanguageModel; supportsTools: boolean; providerOptions?: ProviderOptions }>;
}
