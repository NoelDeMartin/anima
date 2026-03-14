import { type ModelName, type ModelsProvider, type ProviderModel } from '@anima/core';
import { simulateReadableStream, type LanguageModel } from 'ai';
import { MockLanguageModelV3 } from 'ai/test';

export default class TestingModelsProvider implements ModelsProvider {
  private installedModels: Set<ModelName> = new Set();

  constructor() {
    this.installModel('qwen3:1.7b' as ModelName);
  }

  async getModels(): Promise<ProviderModel[]> {
    return Array.from(this.installedModels).map((name) => ({ name, status: 'installed' }));
  }

  async installModel(name: ModelName): Promise<ProviderModel> {
    this.installedModels.add(name);

    return { name, status: 'installed' };
  }

  async deleteModel(name: ModelName): Promise<void> {
    this.installedModels.delete(name);
  }

  async cancelModelInstallation(): Promise<void> {
    // Nothing to do here.
  }

  async createLanguageModel(name: ModelName): Promise<{ model: LanguageModel; supportsTools: boolean }> {
    return {
      supportsTools: false,
      model: new MockLanguageModelV3({
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
