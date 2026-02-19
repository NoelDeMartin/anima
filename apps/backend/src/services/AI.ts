import { facade } from '@noeldemartin/utils';
import { ollama } from 'ollama-ai-provider-v2';
import { MockLanguageModelV3 } from 'ai/test';
import type { LanguageModel } from 'ai';

export const MODEL_AUTO = '__auto__' as const;
export type AIModelName = Parameters<typeof ollama>[0];

export class AIService {
  public model(model: AIModelName): LanguageModel {
    if (model === MODEL_AUTO) {
      return this.autoModel();
    }

    return ollama(model);
  }

  private autoModel(): LanguageModel {
    if (process.env.AUTO_MODEL_MOCK) {
      return new MockLanguageModelV3({
        async doGenerate() {
          return {
            content: [{ type: 'text', text: 'mock response' }],
            finishReason: { unified: 'stop', raw: undefined },
            usage: {
              inputTokens: {
                total: 10,
                noCache: 10,
                cacheRead: undefined,
                cacheWrite: undefined,
              },
              outputTokens: {
                total: 20,
                text: 20,
                reasoning: undefined,
              },
            },
            warnings: [],
          };
        },
      });
    }

    return ollama('qwen3:1.7b');
  }
}

export default facade(AIService);
