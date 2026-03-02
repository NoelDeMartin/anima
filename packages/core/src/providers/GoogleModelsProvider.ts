import type { ModelData, ModelName } from '@anima/core';
import type { LanguageModel } from 'ai';

import APIModelsProvider from './APIModelsProvider';

export default class GoogleModelsProvider extends APIModelsProvider {
  async createLanguageModel(
    name: ModelName,
    data?: ModelData,
  ): Promise<{ model: LanguageModel; supportsTools: boolean }> {
    if (!data?.apiKey) {
      throw new Error('API key is required for Google models');
    }

    const { createGoogleGenerativeAI } = await import('@ai-sdk/google');

    return {
      supportsTools: true,
      model: createGoogleGenerativeAI({ apiKey: data.apiKey })(name),
    };
  }
}
