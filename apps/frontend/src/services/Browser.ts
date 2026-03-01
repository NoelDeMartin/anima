import { Service } from '@aerogel/core';
import type { ModelName } from '@anima/core';
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

  public getModelName(): ModelName {
    switch (this.name) {
      case 'edge':
        return 'Phi-4-mini' as ModelName;
      case 'chrome':
        return 'Gemini Nano' as ModelName;
      default:
        return 'Browser Model' as ModelName;
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
