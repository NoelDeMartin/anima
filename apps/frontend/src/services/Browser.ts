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
  public promptAPIAvailability: 'available' | 'unavailable' | 'unsupported' | null = null;

  protected async boot(): Promise<void> {
    this.promptAPIAvailability = await this.getPromptAPIAvailability();
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

  public async getPromptAPIAvailability(): Promise<'available' | 'unavailable' | 'unsupported'> {
    if (this.promptAPIAvailability !== null) {
      return this.promptAPIAvailability;
    }

    if (!('LanguageModel' in globalThis)) {
      return 'unsupported';
    }

    const availability = await LanguageModel.availability();

    return availability !== 'unavailable' ? 'available' : 'unavailable';
  }
}

export default facade(BrowserService);
