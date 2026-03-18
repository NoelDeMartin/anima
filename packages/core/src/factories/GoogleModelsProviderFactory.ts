import type { AIProvider } from '@anima/core';
import { required } from '@noeldemartin/utils';
import type { LanguageModel } from 'ai';

import APIModelsProviderFactory from './APIModelsProviderFactory';

export default class GoogleModelsProviderFactory extends APIModelsProviderFactory {
  async getAvailableModels(): Promise<string[]> {
    return [
      'gemini-3.1-pro-preview',
      'gemini-3.1-flash-image-preview',
      'gemini-3.1-flash-lite-preview',
      'gemini-3-pro-preview',
      'gemini-3-pro-image-preview',
      'gemini-3-flash-preview',
      'gemini-2.5-pro',
      'gemini-2.5-flash',
      'gemini-2.5-flash-lite',
      'gemini-2.5-flash-lite-preview-06-17',
      'gemini-2.0-flash',
    ];
  }

  async createLanguageModel(provider: AIProvider, name: string): Promise<{ languageModel: LanguageModel }> {
    const { createGoogleGenerativeAI } = await import('@ai-sdk/google');

    return {
      languageModel: createGoogleGenerativeAI({ apiKey: required(provider.apiKey) })(name),
    };
  }
}
