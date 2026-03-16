import type { AIProvider } from '@anima/core';
import { required } from '@noeldemartin/utils';
import type { LanguageModel } from 'ai';

import APIModelsProviderFactory from './APIModelsProviderFactory';

export default class OpenAIModelsProviderFactory extends APIModelsProviderFactory {
  async createLanguageModel(
    provider: AIProvider,
    name: string,
  ): Promise<{ languageModel: LanguageModel; supportsTools: boolean }> {
    const { createOpenAI } = await import('@ai-sdk/openai');

    return {
      supportsTools: true,
      languageModel: createOpenAI({ apiKey: required(provider.apiKey) })(name),
    };
  }
}
