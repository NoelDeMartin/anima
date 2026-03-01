import type { ModelName, ModelsProvider, ProviderModel } from '@anima/core';
import type { LanguageModel } from 'ai';

import Browser from '@/services/Browser';

export default class BrowserModelsProvider implements ModelsProvider {
  private model: ProviderModel | null = null;
  private installMonitor: CreateMonitor | null = null;
  private installListener: ((event: ProgressEvent) => void) | null = null;

  async initialize(): Promise<void> {
    const availability = await LanguageModel.availability();

    switch (availability) {
      case 'downloading':
        this.model = { name: Browser.getModelName(), status: 'installing', progress: 0 };
        await this.watchInstallProgress();
        break;
      case 'available':
        this.model = { name: Browser.getModelName(), status: 'installed' };
        break;
    }
  }

  async getModels(): Promise<ProviderModel[]> {
    return this.model ? [this.model] : [];
  }

  async installModel(name: ModelName): Promise<ProviderModel> {
    if (name !== Browser.getModelName()) {
      throw new Error(`Model '${name}' not available in the browser.`);
    }

    if (this.model) {
      return this.model;
    }

    const model = {
      name,
      status: 'installing' as const,
      progress: 0,
    };

    await this.watchInstallProgress();

    return model;
  }

  deleteModel(): Promise<void> {
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

  async createLanguageModel(): Promise<LanguageModel> {
    const { browserAI } = await import('@browser-ai/core');

    return browserAI();
  }

  private async watchInstallProgress(): Promise<void> {
    this.installListener = (event) => this.onDownloadProgress(event.loaded, event.total);

    await LanguageModel.create({
      monitor: (monitor) => {
        this.installMonitor = monitor;

        this.installListener && monitor.addEventListener('downloadprogress', this.installListener);
      },
    });
  }

  private onDownloadProgress(current: number, total: number): void {
    if (current === total) {
      this.model = {
        name: Browser.getModelName(),
        status: 'installed' as const,
      };

      this.installListener && this.installMonitor?.removeEventListener('downloadprogress', this.installListener);

      this.installMonitor = null;
      this.installListener = null;
      return;
    }

    this.model = {
      name: Browser.getModelName(),
      status: 'installing' as const,
      progress: Math.round((current / total) * 100),
    };
  }
}
