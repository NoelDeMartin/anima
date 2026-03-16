import type { AIProvider } from '@anima/core';
import { required } from '@noeldemartin/utils';
import type { LanguageModel } from 'ai';

import APIModelsProviderFactory from './APIModelsProviderFactory';

export default class GoogleModelsProviderFactory extends APIModelsProviderFactory {
  async createLanguageModel(
    provider: AIProvider,
    name: string,
  ): Promise<{ languageModel: LanguageModel; supportsTools: boolean }> {
    const { createGoogleGenerativeAI } = await import('@ai-sdk/google');

    return {
      supportsTools: true,
      languageModel: createGoogleGenerativeAI({ apiKey: required(provider.apiKey) })(name),
    };
  }
}
