import type { ModelsProvider, ProviderModel, ProviderOptions } from '@anima/core';
import type { LanguageModel } from 'ai';

export default class OtherModelsProvider implements ModelsProvider {
  async isSupported(): Promise<boolean> {
    return false;
  }

  async getModels(): Promise<ProviderModel[]> {
    return [];
  }

  installModel(): Promise<ProviderModel> {
    throw new Error('Unsupported provider');
  }

  deleteModel(): Promise<void> {
    throw new Error('Unsupported provider');
  }

  cancelModelInstallation(): Promise<void> {
    throw new Error('Unsupported provider');
  }

  createLanguageModel(): Promise<{ model: LanguageModel; supportsTools: boolean; providerOptions?: ProviderOptions }> {
    throw new Error('Unsupported provider');
  }
}
