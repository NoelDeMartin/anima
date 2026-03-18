import type { AIProvider } from '@anima/core';
import { required } from '@noeldemartin/utils';
import type { LanguageModel } from 'ai';

import APIModelsProviderFactory from './APIModelsProviderFactory';

export default class OpenAIModelsProviderFactory extends APIModelsProviderFactory {
  async getAvailableModels(): Promise<string[]> {
    return [
      'gpt-5.4-pro',
      'gpt-5.4',
      'gpt-5.3-chat-latest',
      'gpt-5.2-pro',
      'gpt-5.2-chat-latest',
      'gpt-5.2',
      'gpt-5.1-codex-mini',
      'gpt-5.1-codex',
      'gpt-5.1-chat-latest',
      'gpt-5.1',
      'gpt-5-pro',
      'gpt-5',
      'gpt-5-mini',
      'gpt-5-nano',
      'gpt-5-codex',
      'gpt-5-chat-latest',
      'gpt-4.1',
      'gpt-4.1-mini',
      'gpt-4.1-nano',
      'gpt-4o',
      'gpt-4o-mini',
    ];
  }

  async createLanguageModel(provider: AIProvider, name: string): Promise<{ languageModel: LanguageModel }> {
    const { createOpenAI } = await import('@ai-sdk/openai');

    return {
      languageModel: createOpenAI({ apiKey: required(provider.apiKey) })(name),
    };
  }
}
