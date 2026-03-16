import type {
  AIProvider,
  AIProviderEditableFields,
  InstalledModel,
  InstalledModelEditableFields,
  ProviderId,
  ModelId,
  ModelsStorageProvider,
} from '@anima/core';
import { required } from '@noeldemartin/utils';

export default class InMemoryModelsStorageProvider implements ModelsStorageProvider {
  private models: Record<ModelId, InstalledModel> = {};
  private providers: Record<ProviderId, AIProvider> = {};

  async getProvider(id: ProviderId): Promise<AIProvider | null> {
    return this.providers[id] ?? null;
  }

  async getProviders(): Promise<AIProvider[]> {
    return Object.values(this.providers);
  }

  async createProvider(provider: AIProvider): Promise<void> {
    this.providers[provider.id] = provider;
  }

  async updateProvider(id: ProviderId, updates: Partial<AIProviderEditableFields>): Promise<void> {
    const provider = required(this.providers[id], `Provider with id ${id} not found`);

    Object.assign(provider, updates);
  }

  async deleteProvider(id: ProviderId): Promise<void> {
    delete this.providers[id];
  }

  async getModel(id: ModelId): Promise<InstalledModel | null> {
    return this.models[id] ?? null;
  }

  async getModels(): Promise<InstalledModel[]> {
    return Object.values(this.models);
  }

  async createModel(model: InstalledModel): Promise<void> {
    if (model.id in this.models) {
      throw new Error(`Model with id ${model.id} already exists`);
    }

    this.models[model.id] = model;
  }

  async updateModel(id: ModelId, updates: Partial<InstalledModelEditableFields>): Promise<void> {
    const model = required(this.models[id], `Model with id ${id} not found`);

    Object.assign(model, updates);
  }

  async deleteModel(id: ModelId): Promise<void> {
    delete this.models[id];
  }

  async clear(): Promise<void> {
    this.models = {};
    this.providers = {};
  }
}
