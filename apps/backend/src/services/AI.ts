import { facade, fail, objectEntries, objectFromEntries } from '@noeldemartin/utils';
import { generateText, type LanguageModel } from 'ai';

import type { AuthSession } from './Auth';
import type { ModelName } from './Ollama';
import Ollama from './Ollama';

export const MODEL_DEFAULT = '__default__' as const;

export class AIService {
  public async prompt(session: AuthSession, message: string): Promise<string> {
    const { text } = await generateText({
      model: await this.createModel(session.model),
      providerOptions: { ollama: { think: false } },
      prompt: `
            You are a helpful assistant.
            You are talking to a user with the following profile information: ${JSON.stringify(session.user)}.
            Reply to the following message that the user sent you:

            ${message}
        `,
    });

    return text;
  }

  public async installModel(name: ModelName): Promise<void> {
    await Ollama.installModel(name);
  }

  public cancelInstallation(name: ModelName): void {
    Ollama.cancelInstallation(name);
  }

  public getOngoingInstalls(): Record<string, { progress: number }> {
    return objectFromEntries(
      objectEntries(Ollama.getOngoingInstalls()).map(([name, install]) => [name, { progress: install.progress }]),
    );
  }

  public async getInstalledModels(): Promise<string[]> {
    return Ollama.getInstalledModels();
  }

  public async getDefaultModelName(): Promise<string> {
    const models = await this.getInstalledModels();

    if (models.includes('qwen3:1.7b')) {
      return 'qwen3:1.7b';
    }

    return models[0] ?? fail('No models available');
  }

  private async createModel(model: ModelName): Promise<LanguageModel> {
    const modelName = model === MODEL_DEFAULT ? await this.getDefaultModelName() : model;

    return Ollama.createModel(modelName);
  }
}

export default facade(AIService);
