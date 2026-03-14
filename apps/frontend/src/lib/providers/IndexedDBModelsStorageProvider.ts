import type { ModelMetadata, ModelName, ProviderName, ModelsStorageProvider } from '@anima/core';
import { type DBSchema, type IDBPDatabase, openDB } from 'idb';

interface Database extends DBSchema {
  modelsMetadata: {
    key: [string, string];
    value: ModelMetadata;
  };
}

const DB_NAME = 'anima';
const DB_VERSION = 1;

export default class IndexedDBModelsStorageProvider implements ModelsStorageProvider {
  private dbPromise: Promise<IDBPDatabase<Database>>;

  constructor() {
    this.dbPromise = openDB<Database>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains('modelsMetadata')) {
          db.createObjectStore('modelsMetadata', { keyPath: ['provider', 'name'] });
        }
      },
    });
  }

  async getModelMetadata(provider: ProviderName, name: ModelName): Promise<ModelMetadata | null> {
    const db = await this.dbPromise;

    return (await db.get('modelsMetadata', [provider, name])) ?? null;
  }

  async getModelsMetadata(): Promise<ModelMetadata[]> {
    const db = await this.dbPromise;

    return db.getAll('modelsMetadata');
  }

  async storeModelMetadata(metadata: ModelMetadata): Promise<void> {
    const db = await this.dbPromise;

    await db.put('modelsMetadata', metadata);
  }

  async deleteModelMetadata(provider: ProviderName, name: ModelName): Promise<void> {
    const db = await this.dbPromise;

    await db.delete('modelsMetadata', [provider, name]);
  }

  async clear(): Promise<void> {
    const db = await this.dbPromise;

    await db.clear('modelsMetadata');
  }
}
