import { facade, sleep } from '@noeldemartin/utils';
import client from 'ollama';
import type { ollama } from 'ollama-ai-provider-v2';

interface OngoingInstall {
  progress: number;
  stream?: { abort: () => void };
}

export type ModelName = Parameters<typeof ollama>[0];

export class OllamaService {
  protected ongoingInstalls: Record<string, OngoingInstall> = {};

  public async installModel(
    name: ModelName,
    options: { onProgress?: (progress: number) => void; onCompleted?: () => void },
  ): Promise<void> {
    if (name in this.ongoingInstalls || (await this.getInstalledModels()).includes(name)) {
      return;
    }

    this.backgroundInstall(name, options);
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

  protected async backgroundInstall(
    name: ModelName,
    options: { onProgress?: (progress: number) => void; onCompleted?: () => void },
  ): Promise<void> {
    try {
      const install: OngoingInstall = (this.ongoingInstalls[name] = { progress: 0 });
      const stream = await client.pull({ model: name, stream: true });

      install.stream = stream;

      for await (const part of stream) {
        if (!part.total || !part.completed) {
          continue;
        }

        install.progress = Math.round((part.completed / part.total) * 100);

        options.onProgress?.(install.progress);
      }

      options.onCompleted?.();
    } finally {
      delete this.ongoingInstalls[name];
    }
  }
}

export class OllamaServiceMock extends OllamaService {
  private installedModels = ['qwen3:1.7b'];

  public async getInstalledModels(): Promise<string[]> {
    return this.installedModels;
  }

  protected async backgroundInstall(
    name: ModelName,
    options: { onProgress?: (progress: number) => void; onCompleted?: () => void },
  ): Promise<void> {
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

      options.onProgress?.(install.progress);
    }

    if (!aborted) {
      options.onCompleted?.();
    }

    this.installedModels.push(name);

    delete this.ongoingInstalls[name];
  }
}

export default facade(process.env.E2E ? OllamaServiceMock : OllamaService);
