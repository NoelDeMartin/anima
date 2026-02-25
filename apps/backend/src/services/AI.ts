import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { facade, objectFromEntries } from '@noeldemartin/utils';
import { generateText, stepCountIs, type LanguageModel } from 'ai';
import { MockLanguageModelV3 } from 'ai/test';
import { status } from 'elysia';
import { ollama } from 'ollama-ai-provider-v2';
import z from 'zod';

import getTypesIndex from '../tools/getTypesIndex';
import listContainerFiles from '../tools/listContainerFiles';
import readFileContents from '../tools/readFileContents';
import type { AuthSession } from './Auth';
import Auth from './Auth';
import Ollama from './Ollama';
import type { ModelName } from './Ollama';

const BaseModelSchema = z.object({
  name: z.string(),
  enabled: z.boolean(),
  alias: z.string().nullable().optional(),
});

const OllamaModelSchema = BaseModelSchema.extend({ provider: z.literal('ollama') });
const ExternalModelSchema = BaseModelSchema.extend({ provider: z.enum(['google']), apiKey: z.string() });

export const MODEL_PROVIDERS = ['ollama', 'google'] as const;

export const ModelSchema = z.union([
  OllamaModelSchema.extend({ status: z.literal('installed') }),
  OllamaModelSchema.extend({ status: z.literal('installing'), progress: z.number() }),
  ExternalModelSchema.extend({ status: z.literal('installed') }),
]);

export const CreateModelSchema = z.object({
  provider: z.enum(MODEL_PROVIDERS),
  name: z.string(),
  alias: z.string().nullable(),
  apiKey: z.string().nullable(),
});

export const UpdateModelSchema = z.object({
  alias: z.string().nullable().optional(),
  apiKey: z.string().nullable().optional(),
  enabled: z.boolean().optional(),
});

export type Model = z.infer<typeof ModelSchema>;
export type CreateModelPayload = z.infer<typeof CreateModelSchema>;
export type UpdateModelPayload = z.infer<typeof UpdateModelSchema>;

export class AIService {
  private models: Record<string, Model> = {};

  public async loadModels(): Promise<void> {
    const names = await Ollama.getInstalledModels();

    this.models = objectFromEntries(
      names.map((name) => [name, { name, enabled: true, provider: 'ollama', status: 'installed' }]),
    );
  }

  public getModels(): Model[] {
    return Object.values(this.models);
  }

  public async createModel(definition: CreateModelPayload): Promise<Model> {
    if (definition.name in this.models) {
      throw status(400, 'Model already exists');
    }

    if (definition.provider === 'ollama') {
      await Ollama.installModel(definition.name, {
        onProgress: (progress) => {
          const model = this.models[definition.name];

          if (!model || model.status !== 'installing') {
            return;
          }

          model.progress = progress;
        },
        onCompleted: () => {
          const model = this.models[definition.name];

          if (!model || model.status !== 'installing') {
            return;
          }

          const updatedDefinition = { ...model } as Record<string, unknown>;

          updatedDefinition.status = 'installed';
          delete updatedDefinition.progress;

          this.models[definition.name] = ModelSchema.parse(updatedDefinition);
        },
      });

      return (this.models[definition.name] = ModelSchema.parse({
        ...definition,
        enabled: true,
        status: 'installing',
        progress: 0,
      }));
    }

    return (this.models[definition.name] = ModelSchema.parse({
      ...definition,
      enabled: true,
      status: 'installed',
    }));
  }

  public updateModel(name: ModelName, updates: UpdateModelPayload): void {
    if (!this.models[name]) {
      throw status(404, 'Not found');
    }

    this.models[name] = ModelSchema.parse({ ...this.models[name], ...updates });
  }

  public deleteModel(name: ModelName): void {
    if (!this.models[name]) {
      throw status(404, 'Not found');
    }

    delete this.models[name];
  }

  public cancelModelInstallation(name: ModelName): void {
    if (this.models[name]?.provider !== 'ollama' || this.models[name]?.status !== 'installing') {
      return;
    }

    Ollama.cancelInstallation(name);

    delete this.models[name];
  }

  public async prompt(session: AuthSession, model: string, message: string): Promise<string> {
    return Auth.runWithSession(session, async () => {
      const { text } = await generateText({
        model: await this.createLanguageModel(model),
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

  protected async createLanguageModel(name: string): Promise<LanguageModel> {
    const model = this.models[name];

    if (!model) {
      throw status(404, `Model '${name}' not found`);
    }

    switch (model.provider) {
      case 'ollama':
        return ollama(model.name);
      case 'google':
        return createGoogleGenerativeAI({ apiKey: model.apiKey })(model.name);
    }
  }
}

class AIServiceMock extends AIService {
  protected async createLanguageModel(name: string): Promise<LanguageModel> {
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
}

export default facade(process.env.E2E ? AIServiceMock : AIService);
