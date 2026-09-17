import { Browser, Service } from '@aerogel/core';
import { facade } from '@noeldemartin/utils';

export class BrowserAPIsService extends Service {
  public promptAPIAvailability: 'available' | 'unavailable' | 'unsupported' | null = null;

  protected async boot(): Promise<void> {
    this.promptAPIAvailability = await this.getPromptAPIAvailability();
  }

  public getBuiltInModelName(): string {
    switch (Browser.name) {
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

export default facade(BrowserAPIsService);
