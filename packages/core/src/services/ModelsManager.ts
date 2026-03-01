import { ProviderModelSchema, type ModelsProvider, type ProviderModel, type ProviderOptions } from '@anima/core';
import { facade, objectEntries, objectKeys } from '@noeldemartin/utils';
import type { LanguageModel } from 'ai';
import type { $brand } from 'zod';
import z from 'zod';

export const ModelDataSchema = z.object({
  enabled: z.boolean(),
  alias: z.string().nullable().optional(),
  apiKey: z.string().nullable().optional(),
});

export const AIModelSchema = ModelDataSchema.extend({ provider: z.string().brand('ProviderName') }).and(
  ProviderModelSchema,
);

export type AIModel = z.infer<typeof AIModelSchema>;
export type ModelData = z.infer<typeof ModelDataSchema>;
export type ProviderName = string & $brand<'ProviderName'>;
export type ModelName = string & $brand<'ModelName'>;

export class ModelsManagerService {
  private providers: Record<ProviderName, ModelsProvider> = {};
  private modelsData: Map<`${ProviderName}-${ModelName}`, ModelData> = new Map();

  async registerProvider(name: ProviderName, provider: ModelsProvider): Promise<void> {
    this.providers[name] = provider;

    await provider.initialize?.();
  }

  getProviders(): ProviderName[] {
    return objectKeys(this.providers);
  }

  async getModels(): Promise<AIModel[]> {
    const models = await Promise.all(
      objectEntries(this.providers).map(async ([providerName, providerInstance]) => {
        const providerModels = await providerInstance.getModels();

        return providerModels.map((model) => this.toAIModel(providerName, model));
      }),
    );

    return models.flat();
  }

  async createLanguageModel(provider: ProviderName, name: ModelName): Promise<LanguageModel> {
    const data = this.modelsData.get(`${provider}-${name}`);

    return this.requireProvider(provider).createLanguageModel(name, data);
  }

  getProviderOptions(provider: ProviderName, model: ModelName): ProviderOptions {
    return this.requireProvider(provider).getProviderOptions?.(model) ?? {};
  }

  async installModel(provider: ProviderName, model: ModelName, data: ModelData): Promise<AIModel> {
    const providerModel = await this.requireProvider(provider).installModel(model);

    this.modelsData.set(`${provider}-${model}`, ModelDataSchema.parse(data));

    return this.toAIModel(provider, providerModel);
  }

  async updateModel(provider: ProviderName, model: ModelName, updates: Partial<ModelData>): Promise<void> {
    this.modelsData.set(
      `${provider}-${model}`,
      ModelDataSchema.parse({ ...this.modelsData.get(`${provider}-${model}`), ...updates }),
    );
  }

  async deleteModel(provider: ProviderName, model: ModelName): Promise<void> {
    await this.requireProvider(provider).deleteModel(model);

    this.modelsData.delete(`${provider}-${model}`);
  }

  async cancelModelInstallation(provider: ProviderName, model: ModelName): Promise<void> {
    await this.requireProvider(provider).cancelModelInstallation(model);

    this.modelsData.delete(`${provider}-${model}`);
  }

  private requireProvider(name: ProviderName): ModelsProvider {
    const provider = this.providers[name];

    if (!provider) {
      throw new Error(`Provider '${name}' not found`);
    }

    return provider;
  }

  private toAIModel(provider: ProviderName, model: ProviderModel): AIModel {
    return AIModelSchema.parse({
      provider,
      enabled: true,
      ...model,
      ...this.modelsData.get(`${provider}-${model.name}`),
    });
  }
}

export default facade(ModelsManagerService);
