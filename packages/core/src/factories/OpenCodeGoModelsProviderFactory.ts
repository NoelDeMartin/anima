import type { AIProvider } from '@anima/core';
import { required } from '@noeldemartin/utils';
import type { LanguageModel } from 'ai';

import APIModelsProviderFactory from './APIModelsProviderFactory';

const ANTHROPIC_MODELS = [
  'minimax-m3',
  'minimax-m2.7',
  'minimax-m2.5',
  'qwen3.8-max',
  'qwen3.8-flash',
  'qwen3.7-max',
  'qwen3.7-plus',
  'qwen3.6-plus',
];

const OPENAI_RESPONSES_MODELS = [
  'grok-4.7',
  'grok-4.6',
  'gpt-5.6-luna',
  'muse-spark-1.3-contributor',
  'muse-spark-1.2-contributor',
];

const OPENAI_CHAT_MODELS = [
  'glm-5.3-flash',
  'glm-5.3',
  'glm-5.2',
  'glm-5.1',
  'kimi-k3',
  'kimi-k2.7-code',
  'kimi-k2.6',
  'longcat-2.0',
  'deepseek-v4.1-flash',
  'deepseek-v4-pro',
  'deepseek-v4-flash',
  'deepseek-v4-flash-vision-exp',
  'mimo-v2.6-flash',
  'mimo-v2.6-pro',
  'mimo-v2.5',
  'mimo-v2.5-pro',
  'hy4-preview',
  'hy3',
  'space-bunny-free',
];

export default class OpenCodeGoModelsProviderFactory extends APIModelsProviderFactory {
  async getAvailableModels(): Promise<string[]> {
    return [...OPENAI_RESPONSES_MODELS, ...OPENAI_CHAT_MODELS, ...ANTHROPIC_MODELS];
  }

  async createLanguageModel(provider: AIProvider, name: string): Promise<{ languageModel: LanguageModel }> {
    const baseURL = (provider.url || 'https://opencode.ai/zen/go/v1')
      .replace(/\/+$/, '')
      .replace(/\/(messages|responses|chat\/completions)$/, '');

    if (ANTHROPIC_MODELS.includes(name) || name.startsWith('minimax') || name.startsWith('qwen')) {
      const { createAnthropic } = await import('@ai-sdk/anthropic');

      return {
        languageModel: createAnthropic({
          baseURL,
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

    const { createOpenAI } = await import('@ai-sdk/openai');
    const openai = createOpenAI({
      baseURL,
      apiKey: required(provider.apiKey),
    });

    if (
      OPENAI_RESPONSES_MODELS.includes(name) ||
      name.startsWith('grok') ||
      name.startsWith('gpt') ||
      name.startsWith('muse-spark')
    ) {
      return {
        languageModel: openai(name),
      };
    }

    return {
      languageModel: openai.chat(name),
    };
  }
}
