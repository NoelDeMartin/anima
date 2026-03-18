import type { InstallingModel, ModelsProviderFactory } from '@anima/core';
import type { LanguageModel } from 'ai';

export default class OtherModelsProviderFactory implements ModelsProviderFactory {
  async getAvailability(): Promise<'available' | 'unavailable' | 'unsupported'> {
    return 'unavailable';
  }

  async getInstallingModels(): Promise<InstallingModel[]> {
    return [];
  }

  async installModel(): Promise<InstallingModel> {
    throw new Error('Unsupported provider');
  }

  async uninstallModel(): Promise<void> {
    throw new Error('Unsupported provider');
  }

  async cancelModelInstallation(): Promise<void> {
    throw new Error('Unsupported provider');
  }

  async createLanguageModel(): Promise<{ languageModel: LanguageModel }> {
    throw new Error('Unsupported provider');
  }
}
