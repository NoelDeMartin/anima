import {
  ModelMetadataSchema,
  ProviderModelSchema,
  storage,
  type ModelMetadataEditableFields,
  type ModelName,
  type ModelsProvider,
  type ProviderModel,
  type ProviderName,
  type ProviderOptions,
} from '@anima/core';
import { facade, objectEntries, objectKeys } from '@noeldemartin/utils';
import type { LanguageModel } from 'ai';
import type z from 'zod';

export const AIModelSchema = ModelMetadataSchema.and(ProviderModelSchema);

export type AIModel = z.infer<typeof AIModelSchema>;

export class ModelsManagerService {
  private providers: Record<ProviderName, ModelsProvider> = {};

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

        return await Promise.all(providerModels.map((model) => this.toAIModel(providerName, model)));
      }),
    );

    return models.flat();
  }

  async createLanguageModel(
    provider: ProviderName,
    name: ModelName,
  ): Promise<{ model: LanguageModel; supportsTools: boolean; providerOptions?: ProviderOptions }> {
    const data = await storage().getModelMetadata(provider, name);

    return this.requireProvider(provider).createLanguageModel(name, data);
  }

  async installModel(provider: ProviderName, model: ModelName, data: ModelMetadataEditableFields): Promise<AIModel> {
    const providerModel = await this.requireProvider(provider).installModel(model);

    await storage().storeModelMetadata({ provider, name: model, ...data });

    return this.toAIModel(provider, providerModel);
  }

  async upsertModel(
    provider: ProviderName,
    model: ModelName,
    updates: Partial<ModelMetadataEditableFields>,
  ): Promise<void> {
    const metadata = (await storage().getModelMetadata(provider, model)) ?? { provider, name: model, enabled: true };

    await storage().storeModelMetadata({
      ...metadata,
      ...updates,
    });
  }

  async deleteModel(provider: ProviderName, model: ModelName): Promise<void> {
    await this.requireProvider(provider).deleteModel(model);
    await storage().deleteModelMetadata(provider, model);
  }

  async cancelModelInstallation(provider: ProviderName, model: ModelName): Promise<void> {
    await this.requireProvider(provider).cancelModelInstallation(model);
    await storage().deleteModelMetadata(provider, model);
  }

  private requireProvider(name: ProviderName): ModelsProvider {
    const provider = this.providers[name];

    if (!provider) {
      throw new Error(`Provider '${name}' not found`);
    }

    return provider;
  }

  private async toAIModel(provider: ProviderName, model: ProviderModel): Promise<AIModel> {
    return AIModelSchema.parse({
      provider,
      enabled: true,
      ...model,
      ...(await storage().getModelMetadata(provider, model.name)),
    });
  }
}

export default facade(ModelsManagerService);
