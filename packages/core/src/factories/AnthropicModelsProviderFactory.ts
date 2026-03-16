import type { AIProvider } from '@anima/core';
import { required } from '@noeldemartin/utils';
import type { LanguageModel } from 'ai';

import APIModelsProviderFactory from './APIModelsProviderFactory';

export default class AnthropicModelsProviderFactory extends APIModelsProviderFactory {
  async createLanguageModel(
    provider: AIProvider,
    name: string,
  ): Promise<{ languageModel: LanguageModel; supportsTools: boolean }> {
    const { createAnthropic } = await import('@ai-sdk/anthropic');

    return {
      supportsTools: true,
      languageModel: createAnthropic({ apiKey: required(provider.apiKey) })(name),
    };
  }
}
