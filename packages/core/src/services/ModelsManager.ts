import {
  ModelMetadataSchema,
  ProviderModelSchema,
  modelsStorage,
  type ModelMetadataEditableFields,
  type ModelName,
  type ModelsProvider,
  type ProviderModel,
  type ProviderName,
  type ProviderOptions,
} from '@anima/core';
import { facade, objectEntries } from '@noeldemartin/utils';
import type { LanguageModel } from 'ai';
import z from 'zod';

export const AIModelSchema = ModelMetadataSchema.and(ProviderModelSchema);
export const AIProviderSchema = z.object({
  name: z.string().brand('ProviderName'),
  requiresAPIKey: z.boolean(),
  supported: z.boolean(),
  availableNames: z.array(z.string().brand('ModelName')).optional(),
});

export type AIModel = z.infer<typeof AIModelSchema>;
export type AIProvider = z.infer<typeof AIProviderSchema>;

export class ModelsManagerService {
  private providers: Record<ProviderName, ModelsProvider> = {};

  async registerProvider(name: ProviderName, provider: ModelsProvider): Promise<void> {
    const supported = provider.isSupported ? await provider.isSupported() : true;

    this.providers[name] = provider;

    supported && (await provider.initialize?.());
  }

  async getProviders(): Promise<AIProvider[]> {
    const providers = await Promise.all(
      objectEntries(this.providers).map(async ([name, provider]) => ({
        name,
        requiresAPIKey: (await provider.requiresAPIKey?.()) ?? false,
        supported: (await provider.isSupported?.()) ?? true,
        availableNames: await provider.availableNames?.(),
      })),
    );

    return providers;
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
    const data = await modelsStorage().getModelMetadata(provider, name);

    return this.requireProvider(provider).createLanguageModel(name, data);
  }

  async installModel(provider: ProviderName, model: ModelName, data: ModelMetadataEditableFields): Promise<AIModel> {
    const providerModel = await this.requireProvider(provider).installModel(model);

    await modelsStorage().storeModelMetadata({ provider, name: model, ...data });

    return this.toAIModel(provider, providerModel);
  }

  async upsertModel(
    provider: ProviderName,
    model: ModelName,
    updates: Partial<ModelMetadataEditableFields>,
  ): Promise<void> {
    const metadata = (await modelsStorage().getModelMetadata(provider, model)) ?? {
      provider,
      name: model,
      enabled: true,
    };

    await modelsStorage().storeModelMetadata({
      ...metadata,
      ...updates,
    });
  }

  async deleteModel(provider: ProviderName, model: ModelName): Promise<void> {
    await this.requireProvider(provider).deleteModel(model);
    await modelsStorage().deleteModelMetadata(provider, model);
  }

  async cancelModelInstallation(provider: ProviderName, model: ModelName): Promise<void> {
    await this.requireProvider(provider).cancelModelInstallation(model);
    await modelsStorage().deleteModelMetadata(provider, model);
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
      ...(await modelsStorage().getModelMetadata(provider, model.name)),
    });
  }
}

export default facade(ModelsManagerService);
