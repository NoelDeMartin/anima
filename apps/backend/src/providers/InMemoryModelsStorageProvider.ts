import type { ModelMetadata, ModelName, ProviderName, ModelsStorageProvider } from '@anima/core';

export default class InMemoryModelsStorageProvider implements ModelsStorageProvider {
  private modelsMetadata: ModelMetadata[] = [];

  async getModelMetadata(provider: ProviderName, name: ModelName): Promise<ModelMetadata | null> {
    return this.modelsMetadata.find((model) => model.provider === provider && model.name === name) ?? null;
  }

  async getModelsMetadata(): Promise<ModelMetadata[]> {
    return this.modelsMetadata;
  }

  async storeModelMetadata(metadata: ModelMetadata): Promise<void> {
    const index = this.modelsMetadata.findIndex(
      (model) => model.provider === metadata.provider && model.name === metadata.name,
    );
    if (index >= 0) {
      this.modelsMetadata[index] = metadata;
    } else {
      this.modelsMetadata.push(metadata);
    }
  }

  async deleteModelMetadata(provider: ProviderName, name: ModelName): Promise<void> {
    this.modelsMetadata = this.modelsMetadata.filter((model) => model.provider !== provider || model.name !== name);
  }
}
