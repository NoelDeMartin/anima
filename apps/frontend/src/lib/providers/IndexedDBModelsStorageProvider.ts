import type {
  AIProvider,
  AIProviderEditableFields,
  InstalledModel,
  InstalledModelEditableFields,
  ModelId,
  ModelsStorageProvider,
  ProviderId,
} from '@anima/core';
import { type DBSchema, type IDBPDatabase, openDB } from 'idb';

interface Database extends DBSchema {
  models: {
    key: string;
    value: InstalledModel;
  };
  providers: {
    key: string;
    value: AIProvider;
  };
}

const DB_NAME = 'anima';
const DB_VERSION = 1;

export default class IndexedDBModelsStorageProvider implements ModelsStorageProvider {
  private dbPromise: Promise<IDBPDatabase<Database>>;

  constructor() {
    this.dbPromise = openDB<Database>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        db.createObjectStore('models', { keyPath: 'id' });
        db.createObjectStore('providers', { keyPath: 'id' });
      },
    });
  }

  async getModel(id: ModelId): Promise<InstalledModel | null> {
    const db = await this.dbPromise;
    const model = await db.get('models', id);

    return model ?? null;
  }

  async getModels(): Promise<InstalledModel[]> {
    const db = await this.dbPromise;

    return db.getAll('models');
  }

  async createModel(model: InstalledModel): Promise<void> {
    const db = await this.dbPromise;

    await db.add('models', model);
  }

  async updateModel(id: ModelId, updates: Partial<InstalledModelEditableFields>): Promise<void> {
    const db = await this.dbPromise;
    const existing = await db.get('models', id);

    if (!existing) {
      throw new Error(`Model with id ${id} not found`);
    }

    await db.put('models', { ...existing, ...updates });
  }

  async deleteModel(id: ModelId): Promise<void> {
    const db = await this.dbPromise;

    await db.delete('models', id);
  }

  async getProvider(id: ProviderId): Promise<AIProvider | null> {
    const db = await this.dbPromise;
    const provider = await db.get('providers', id);

    return provider ?? null;
  }

  async getProviders(): Promise<AIProvider[]> {
    const db = await this.dbPromise;

    return db.getAll('providers');
  }

  async createProvider(provider: AIProvider): Promise<void> {
    const db = await this.dbPromise;

    await db.add('providers', provider);
  }

  async updateProvider(id: ProviderId, updates: Partial<AIProviderEditableFields>): Promise<void> {
    const db = await this.dbPromise;
    const existing = await db.get('providers', id);

    if (!existing) {
      throw new Error(`Provider with id ${id} not found`);
    }

    await db.put('providers', { ...existing, ...updates });
  }

  async deleteProvider(id: ProviderId): Promise<void> {
    const db = await this.dbPromise;

    await db.delete('providers', id);
  }

  async clear(): Promise<void> {
    const db = await this.dbPromise;

    await db.clear('models');
    await db.clear('providers');
  }
}
