import { type InstallingModel, type ModelsProviderFactory, type ModelId, type AIProvider } from '@anima/core';
import { simulateReadableStream, type LanguageModel } from 'ai';
import { MockLanguageModelV3 } from 'ai/test';

export default class TestingModelsProviderFactory implements ModelsProviderFactory {
  private installedModels: Set<string> = new Set();

  constructor() {
    this.installedModels.add('qwen3:1.7b');
  }

  async supportsTools(): Promise<boolean> {
    return false;
  }

  async getPreinstalledModels(): Promise<string[]> {
    return Array.from(this.installedModels);
  }

  async getInstallingModels(): Promise<InstallingModel[]> {
    return [];
  }

  async installModel(
    provider: AIProvider,
    id: ModelId,
    name: string,
    options: { onInstalled: () => Promise<void> },
  ): Promise<InstallingModel> {
    this.installedModels.add(name);

    await options.onInstalled();

    return {
      id,
      name,
      providerId: provider.id,
      progress: 1,
    };
  }

  async uninstallModel(_: AIProvider, name: string): Promise<void> {
    this.installedModels.delete(name);
  }

  async cancelModelInstallation(): Promise<void> {
    // Nothing to do here.
  }

  async createLanguageModel(_: AIProvider, name: string): Promise<{ languageModel: LanguageModel }> {
    return {
      languageModel: new MockLanguageModelV3({
        async doStream({ prompt }) {
          const message = String((prompt as any)[prompt.length - 1]?.content[0]?.text);

          return {
            stream: simulateReadableStream({
              chunks: [
                { type: 'text-start', id: 'text-1' },
                { type: 'text-delta', id: 'text-1', delta: 'mock response for model ' },
                { type: 'text-delta', id: 'text-1', delta: `'${name}'` },
                { type: 'text-delta', id: 'text-1', delta: ` to '${message}'` },
                { type: 'text-end', id: 'text-1' },
                {
                  type: 'finish',
                  finishReason: { unified: 'stop', raw: undefined },
                  logprobs: undefined,
                  usage: {
                    inputTokens: {
                      total: 3,
                      noCache: 3,
                      cacheRead: undefined,
                      cacheWrite: undefined,
                    },
                    outputTokens: {
                      total: 10,
                      text: 10,
                      reasoning: undefined,
                    },
                  },
                },
              ],
            }),
          };
        },
      }),
    };
  }
}
