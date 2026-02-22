import { facade, fail, objectEntries, objectFromEntries } from '@noeldemartin/utils';
import { generateText, stepCountIs, type LanguageModel } from 'ai';

import { MODEL_DEFAULT } from '../lib/constants';
import getTypesIndex from '../tools/getTypesIndex';
import listContainerFiles from '../tools/listContainerFiles';
import readFileContents from '../tools/readFileContents';
import type { AuthSession } from './Auth';
import Auth from './Auth';
import type { ModelName } from './Ollama';
import Ollama from './Ollama';

export class AIService {
  public async prompt(session: AuthSession, message: string): Promise<string> {
    return Auth.runWithSession(session, async () => {
      const { text } = await generateText({
        model: await this.createModel(session.model),
        providerOptions: { ollama: { think: false } },
        tools: { getTypesIndex, listContainerFiles, readFileContents },
        system: `
            You are a privacy-first personal assistant called Ànima.

            ${session.user?.name ? `You are talking to ${session.user?.name}.` : ''}

            You have access to ${session.user?.name ?? 'the user'}'s personal data, notes, and digital life, and have been
            equipped with a specific set of tools to navigate, search, and read this data.

            CRITICAL RULES:
            1. NO HALLUCINATIONS: Never guess or invent personal facts about the user. If you do not know the answer, you must use your tools to search the POD. If the data is not there, politely state that you cannot find it.
            2. NO GUESSING PATHS: Never guess where data lives. Always start your investigation by using the 'getTypesIndex' tool to discover the correct folders and data types.
            3. DATA TRANSLATION: Your tools will return semantic data using RDF vocabularies. Read this data using your knowledge of standard web ontologies (like schema.org) to understand the context, but NEVER show raw JSON, URLs, or technical schema properties to the user. Translate all findings into natural, conversational language.
            4. FOLLOW LINKS: If you read a file and find a URL pointing to another resource, use the 'getDocument' tool to fetch it if you need that context to answer the user's question.
        `,
        stopWhen: stepCountIs(10),
        prompt: `${message} (System Note: If this requires personal context, do not refuse. Use the tools to search my private data.)`,
      });

      return text;
    });
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
