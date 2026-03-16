import { Service } from '@aerogel/core';
import { facade } from '@noeldemartin/utils';

function getBrowserName(): 'chrome' | 'edge' | 'other' {
  const userAgent = navigator.userAgent;

  if (userAgent.includes('Edg/')) {
    return 'edge';
  }

  if (userAgent.includes('Chrome/')) {
    return 'chrome';
  }

  return 'other';
}

export class BrowserService extends Service {
  public name: 'chrome' | 'edge' | 'other' = getBrowserName();
  public promptAPIAvailable: boolean | null = null;

  protected async boot(): Promise<void> {
    this.promptAPIAvailable = await this.isPromptAPIAvailable();
  }

  public getModelName(): string {
    switch (this.name) {
      case 'edge':
        return 'Phi-4-mini';
      case 'chrome':
        return 'Gemini Nano';
      default:
        return 'Browser Model';
    }
  }

  public async isPromptAPIAvailable(): Promise<boolean> {
    if (this.promptAPIAvailable !== null) {
      return this.promptAPIAvailable;
    }

    if (!('LanguageModel' in globalThis)) {
      return false;
    }

    const availability = await LanguageModel.availability();

    return availability !== 'unavailable';
  }
}

export default facade(BrowserService);
