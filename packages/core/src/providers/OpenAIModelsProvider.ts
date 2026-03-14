import type { ModelMetadata, ModelName } from '@anima/core';
import type { Nullable } from '@noeldemartin/utils';
import type { LanguageModel } from 'ai';

import APIModelsProvider from './APIModelsProvider';

export default class OpenAIModelsProvider extends APIModelsProvider {
  async createLanguageModel(
    name: ModelName,
    data: Nullable<ModelMetadata>,
  ): Promise<{ model: LanguageModel; supportsTools: boolean }> {
    if (!data?.apiKey) {
      throw new Error('API key is required for OpenAI models');
    }

    const { createOpenAI } = await import('@ai-sdk/openai');

    return {
      supportsTools: true,
      model: createOpenAI({ apiKey: data.apiKey })(name),
    };
  }
}
