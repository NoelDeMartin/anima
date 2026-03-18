import type { InstallingModel, ModelsProviderFactory, ProviderOptions, ModelId, AIProvider } from '@anima/core';
import type { LanguageModel } from 'ai';

export default abstract class APIModelsProviderFactory implements ModelsProviderFactory {
  protected runtime: 'server' | 'browser';

  constructor(runtime: 'server' | 'browser') {
    this.runtime = runtime;
  }

  async requiresAPIKey(): Promise<boolean> {
    return true;
  }

  async getInstallingModels(): Promise<InstallingModel[]> {
    return [];
  }

  async installModel(
    provider: AIProvider,
    id: ModelId,
    name: string,
    options: { onInstalled: () => Promise<void> },
  ): Promise<InstallingModel> {
    await options.onInstalled();

    return {
      id,
      name,
      providerId: provider.id,
      progress: 1,
    };
  }

  async uninstallModel(): Promise<void> {
    // API models don't need to be uninstalled locally.
  }

  async cancelModelInstallation(): Promise<void> {
    // Nothing to do here, API models are installed instantly.
  }

  abstract createLanguageModel(
    provider: AIProvider,
    name: string,
  ): Promise<{ languageModel: LanguageModel; providerOptions?: ProviderOptions }>;
}
