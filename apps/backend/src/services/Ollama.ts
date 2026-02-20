import { facade, sleep } from '@noeldemartin/utils';
import type { LanguageModel } from 'ai';
import { MockLanguageModelV3 } from 'ai/test';
import client from 'ollama';
import { ollama } from 'ollama-ai-provider-v2';

interface OngoingInstall {
  progress: number;
  stream?: { abort: () => void };
}

export type ModelName = Parameters<typeof ollama>[0];

export class OllamaService {
  protected ongoingInstalls: Record<string, OngoingInstall> = {};

  public createModel(name: ModelName): LanguageModel {
    return ollama(name);
  }

  public async installModel(name: ModelName): Promise<void> {
    if (name in this.ongoingInstalls || (await this.getInstalledModels()).includes(name)) {
      return;
    }

    this.backgroundInstall(name);
  }

  public cancelInstallation(name: ModelName): void {
    this.ongoingInstalls[name]?.stream?.abort();

    delete this.ongoingInstalls[name];
  }

  public getOngoingInstalls(): Record<string, OngoingInstall> {
    return this.ongoingInstalls;
  }

  public async getInstalledModels(): Promise<string[]> {
    const response = await client.list();

    return response.models.map((model) => model.name);
  }

  protected async backgroundInstall(name: ModelName): Promise<void> {
    try {
      const install: OngoingInstall = (this.ongoingInstalls[name] = { progress: 0 });
      const stream = await client.pull({ model: name, stream: true });

      install.stream = stream;

      for await (const part of stream) {
        if (!part.total || !part.completed) {
          continue;
        }

        install.progress = Math.round((part.completed / part.total) * 100);
      }
    } finally {
      delete this.ongoingInstalls[name];
    }
  }
}

export class OllamaServiceMock extends OllamaService {
  private installedModels = ['qwen3:1.7b'];

  public createModel(name: ModelName): LanguageModel {
    return new MockLanguageModelV3({
      async doGenerate() {
        return {
          content: [{ type: 'text', text: `mock response for model '${name}'` }],
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

  public async getInstalledModels(): Promise<string[]> {
    return this.installedModels;
  }

  protected async backgroundInstall(name: ModelName): Promise<void> {
    let aborted = false;
    const install: OngoingInstall = (this.ongoingInstalls[name] = {
      progress: 0,
      stream: { abort: () => (aborted = true) },
    });

    for (let i = 0; i < 100; i++) {
      install.progress = i;

      await sleep(3000 / 100);

      if (aborted) {
        return;
      }
    }

    this.installedModels.push(name);

    delete this.ongoingInstalls[name];
  }
}

export default facade(process.env.E2E ? OllamaServiceMock : OllamaService);
