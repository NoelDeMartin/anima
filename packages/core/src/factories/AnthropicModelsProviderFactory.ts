import type { AIProvider } from '@anima/core';
import { required } from '@noeldemartin/utils';
import type { LanguageModel } from 'ai';

import APIModelsProviderFactory from './APIModelsProviderFactory';

export default class AnthropicModelsProviderFactory extends APIModelsProviderFactory {
  async getAvailableModels(): Promise<string[]> {
    return [
      'claude-opus-4-6',
      'claude-sonnet-4-6',
      'claude-opus-4-5',
      'claude-haiku-4-5',
      'claude-sonnet-4-5',
      'claude-opus-4-1',
      'claude-opus-4-0',
      'claude-sonnet-4-0',
    ];
  }

  async createLanguageModel(provider: AIProvider, name: string): Promise<{ languageModel: LanguageModel }> {
    const { createAnthropic } = await import('@ai-sdk/anthropic');

    return {
      languageModel: createAnthropic({
        apiKey: required(provider.apiKey),
        headers:
          this.runtime === 'browser'
            ? {
                'anthropic-dangerous-direct-browser-access': 'true',
              }
            : undefined,
      })(name),
    };
  }
}
