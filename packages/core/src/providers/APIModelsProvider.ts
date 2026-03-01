import type { ModelData, ModelName, ModelsProvider, ProviderModel } from '@anima/core';
import type { LanguageModel } from 'ai';

export default abstract class APIModelsProvider implements ModelsProvider {
  private installedModels: Set<ModelName> = new Set();

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

  abstract createLanguageModel(name: ModelName, data?: ModelData): Promise<LanguageModel>;
}
