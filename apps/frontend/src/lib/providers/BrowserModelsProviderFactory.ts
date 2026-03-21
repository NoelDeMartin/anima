import type { ModelsProviderFactory, InstallingModel, AIProvider, ModelId, ProviderOptions } from '@anima/core';
import { uuid } from '@noeldemartin/utils';
import type { LanguageModel } from 'ai';

import Browser from '@/services/Browser';

export default class BrowserModelsProviderFactory implements ModelsProviderFactory {
  private model: InstallingModel | { name: string; status: 'installed' } | null = null;
  private installMonitor: CreateMonitor | null = null;
  private installListener: ((event: ProgressEvent) => void) | null = null;

  async supportsTools(): Promise<boolean> {
    return false;
  }

  async getAvailability(): Promise<'available' | 'unavailable' | 'unsupported'> {
    return Browser.getPromptAPIAvailability();
  }

  async getPreinstalledModels(): Promise<string[]> {
    const availability = await LanguageModel.availability();

    if (availability === 'available') {
      this.model = { name: Browser.getModelName(), status: 'installed' };

      return [Browser.getModelName()];
    }

    return [];
  }

  async getInstallingModels(provider: AIProvider): Promise<InstallingModel[]> {
    if (this.model) {
      return 'progress' in this.model ? [this.model] : [];
    }

    const availability = await LanguageModel.availability();

    if (availability === 'downloading') {
      this.model = { id: uuid() as ModelId, providerId: provider.id, name: Browser.getModelName(), progress: 0 };

      await this.watchInstallProgress();

      return [this.model];
    }

    return [];
  }

  async installModel(
    provider: AIProvider,
    id: ModelId,
    name: string,
    options: { onInstalled: () => Promise<void> },
  ): Promise<InstallingModel> {
    if (name !== Browser.getModelName()) {
      throw new Error(`Model '${name}' not available in the browser.`);
    }

    if (this.model && !('status' in this.model)) {
      return this.model;
    }

    const model: InstallingModel = {
      id,
      providerId: provider.id,
      name,
      progress: 0,
    };

    this.model = { id, providerId: provider.id, name, progress: 0 };

    await this.watchInstallProgress(options.onInstalled);

    return model;
  }

  async uninstallModel(): Promise<void> {
    throw new Error('Browser models cannot be deleted.');
  }

  async cancelModelInstallation(): Promise<void> {
    if (!this.installMonitor || !this.installListener) {
      return;
    }

    this.installMonitor.removeEventListener('downloadprogress', this.installListener);

    this.model = null;
    this.installMonitor = null;
    this.installListener = null;
  }

  async createLanguageModel(): Promise<{
    languageModel: LanguageModel;
    providerOptions?: ProviderOptions;
  }> {
    const { browserAI } = await import('@browser-ai/core');

    return { languageModel: browserAI() };
  }

  private async watchInstallProgress(onInstalled?: () => Promise<void>): Promise<void> {
    this.installListener = (event) => this.onDownloadProgress(event.loaded, event.total, onInstalled);

    await LanguageModel.create({
      monitor: (monitor) => {
        this.installMonitor = monitor;

        this.installListener && monitor.addEventListener('downloadprogress', this.installListener);
      },
    });
  }

  private onDownloadProgress(current: number, total: number, onInstalled?: () => Promise<void>): void {
    if (current === total) {
      this.model = {
        name: Browser.getModelName(),
        status: 'installed' as const,
      };

      this.installListener && this.installMonitor?.removeEventListener('downloadprogress', this.installListener);

      this.installMonitor = null;
      this.installListener = null;

      void onInstalled?.();

      return;
    }

    this.model = {
      ...(this.model as InstallingModel),
      progress: Math.round((current / total) * 100),
    };
  }
}
