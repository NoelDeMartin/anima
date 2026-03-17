import {
  InstalledModelSchema,
  InstallingModelSchema,
  type AIProvider,
  type AIProviderEditableFields,
  type InstalledModelEditableFields,
  type ModelId,
  type ModelsProviderFactory,
  type ModelsStorageProvider,
  type ProviderId,
  type ProviderOptions,
  type ProviderType,
} from '@anima/core';
import { facade, required, uuid } from '@noeldemartin/utils';
import type { LanguageModel } from 'ai';
import z from 'zod';

export const AIModelSchema = z.union([
  InstalledModelSchema.extend({
    status: z.literal('installed'),
  }),
  InstallingModelSchema.extend({
    status: z.literal('installing'),
  }),
]);

export const AIProviderFactorySchema = z.object({
  type: z.string().brand('ProviderType'),
  requiresAPIKey: z.boolean(),
  requiresUrl: z.boolean(),
  isSupported: z.boolean(),
  availableModels: z.array(z.string()).optional(),
  defaultConfig: z.object({
    url: z.string().optional(),
    apiKey: z.string().optional(),
  }),
});

export type AIModel = z.infer<typeof AIModelSchema>;
export type AIProviderFactory = z.infer<typeof AIProviderFactorySchema>;

export class ModelsManagerService {
  private storage: ModelsStorageProvider | null = null;
  private factories: [ProviderType, ModelsProviderFactory][] = [];

  setStorageProvider(storage: ModelsStorageProvider): void {
    this.storage = storage;
  }

  registerFactory(type: ProviderType, factory: ModelsProviderFactory): void {
    this.factories.push([type, factory]);
  }

  async getProviderFactories(): Promise<AIProviderFactory[]> {
    const factories = await Promise.all(
      this.factories.map(async ([type, factory]) => ({
        type,
        requiresAPIKey: (await factory.requiresAPIKey?.()) ?? false,
        requiresUrl: (await factory.requiresUrl?.()) ?? false,
        isSupported: (await factory.isSupported?.()) ?? true,
        defaultConfig: (await factory.getDefaultConfig?.()) ?? {},
        availableModels: await factory.getAvailableModels?.(),
      })),
    );

    return factories;
  }

  getProvider(id: ProviderId): Promise<AIProvider | null> {
    return this.requireStorage().getProvider(id);
  }

  getProviders(): Promise<AIProvider[]> {
    return this.requireStorage().getProviders();
  }

  async createProvider(provider: Omit<AIProvider, 'id'>): Promise<AIProvider> {
    const factory = this.factories.find(([type]) => provider.type === type)?.[1];
    const providerId = uuid() as ProviderId;
    const newProvider = {
      id: providerId,
      ...provider,
    };

    if (!factory) {
      throw new Error(`Unknown provider type: ${provider.type}`);
    }

    await this.requireStorage().createProvider(newProvider);

    const names = (await factory.getPreinstalledModels?.(newProvider)) ?? [];

    await Promise.all(
      names.map((name) =>
        this.requireStorage().createModel({ id: uuid() as ModelId, providerId, name, enabled: true }),
      ),
    );

    return newProvider;
  }

  async updateProvider(id: ProviderId, updates: Partial<AIProviderEditableFields>): Promise<void> {
    const provider = await this.requireStorage().getProvider(id);

    if (!provider) {
      throw new Error(`Provider '${id}' not found`);
    }

    await this.requireStorage().updateProvider(id, updates);
  }

  async deleteProvider(id: ProviderId): Promise<void> {
    const models = await this.getModels();

    await Promise.all(
      models.map(async (model) => {
        if (model.providerId !== id) {
          return;
        }

        await this.deleteModel(model.id, { uninstall: false });
      }),
    );

    await this.requireStorage().deleteProvider(id);
  }

  async getModel(id: ModelId): Promise<AIModel | null> {
    const model = await this.requireStorage().getModel(id);
    const provider = model && (await this.requireStorage().getProvider(model.providerId));

    if (!provider) {
      return null;
    }

    return { ...model, status: 'installed' as const };
  }

  async getModels(): Promise<AIModel[]> {
    const installedModels = await this.requireStorage().getModels();
    const providers = await this.requireStorage().getProviders();
    const installingModels = await Promise.all(
      providers.map(async (provider) => {
        const factory = required(this.factories.find(([type]) => provider.type === type)?.[1]);

        return factory.getInstallingModels(provider);
      }),
    );

    return [
      ...installedModels.map((model) => ({ ...model, status: 'installed' as const })),
      ...installingModels.flat().map((model) => ({ ...model, status: 'installing' as const })),
    ];
  }

  async createLanguageModel(
    modelId: ModelId,
  ): Promise<{ languageModel: LanguageModel; supportsTools: boolean; providerOptions?: ProviderOptions }> {
    const model = required(await this.requireStorage().getModel(modelId));
    const provider = required(await this.requireStorage().getProvider(model.providerId));
    const factory = required(this.factories.find(([type]) => provider.type === type)?.[1]);

    return factory.createLanguageModel(provider, model.name);
  }

  async createModel(providerId: ProviderId, name: string, data: InstalledModelEditableFields): Promise<AIModel> {
    const id = uuid() as ModelId;
    const provider = required(await this.requireStorage().getProvider(providerId));
    const factory = required(this.factories.find(([type]) => provider.type === type)?.[1]);
    const installingModel = await factory.installModel(provider, id, name, {
      onInstalled: async () => {
        await this.requireStorage().createModel({
          id,
          providerId,
          name,
          ...data,
        });
      },
    });
    const model = await this.requireStorage().getModel(id);

    return model ? { ...model, status: 'installed' } : { ...installingModel, status: 'installing' };
  }

  async updateModel(id: ModelId, updates: Partial<InstalledModelEditableFields>): Promise<void> {
    await this.requireStorage().updateModel(id, updates);
  }

  async deleteModel(id: ModelId, options: { uninstall?: boolean } = {}): Promise<void> {
    const uninstall = options.uninstall ?? true;
    const model = required(await this.requireStorage().getModel(id));
    const provider = required(await this.requireStorage().getProvider(model.providerId));
    const factory = required(this.factories.find(([type]) => provider.type === type)?.[1]);

    uninstall && (await factory.uninstallModel(provider, model.name));

    await this.requireStorage().deleteModel(id);
  }

  async cancelModelInstallation(providerId: ProviderId, id: ModelId): Promise<void> {
    const provider = required(await this.requireStorage().getProvider(providerId));
    const factory = required(this.factories.find(([type]) => provider?.type === type)?.[1]);

    await factory.cancelModelInstallation(provider, id);
  }

  async clear(): Promise<void> {
    await this.requireStorage().clear();
  }

  private requireStorage(): ModelsStorageProvider {
    return required(this.storage, 'Models storage has not been initialized');
  }
}

export default facade(ModelsManagerService);
