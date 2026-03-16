import { existsSync } from 'node:fs';
import { mkdir, readFile, readdir, writeFile, rm } from 'node:fs/promises';
import { homedir } from 'node:os';
import { basename, join } from 'node:path';

import {
  AIProviderSchema,
  InstalledModelSchema,
  type AIProvider,
  type AIProviderEditableFields,
  type InstalledModel,
  type InstalledModelEditableFields,
  type ModelId,
  type ModelsStorageProvider,
  type ProviderId,
} from '@anima/core';
import { isTruthy } from '@noeldemartin/utils';
import type z from 'zod';

import Auth from '../services/Auth';

const CHUNK_SIZE = 10;

export default class FilesystemModelsStorageProvider implements ModelsStorageProvider {
  private rootStorage: string;

  constructor(root?: string) {
    this.rootStorage = root ?? join(homedir(), '.anima');
  }

  async getModel(id: ModelId): Promise<InstalledModel | null> {
    return this.readJson(InstalledModelSchema, `/models/${id}.json`);
  }

  async getModels(): Promise<InstalledModel[]> {
    const ids = await this.listFileNames('/models/');
    const models = await this.processInChunks(ids, (id) => this.getModel(id as ModelId));

    return models.filter(isTruthy);
  }

  async createModel(model: InstalledModel): Promise<void> {
    await this.writeJson(`/models/${model.id}.json`, model);
  }

  async updateModel(id: ModelId, updates: Partial<InstalledModelEditableFields>): Promise<void> {
    const existing = await this.getModel(id);

    if (!existing) {
      throw new Error(`Model with id ${id} not found`);
    }

    await this.writeJson(`/models/${id}.json`, { ...existing, ...updates });
  }

  async deleteModel(id: ModelId): Promise<void> {
    await this.removeFile(`/models/${id}.json`);
  }

  async getProvider(id: ProviderId): Promise<AIProvider | null> {
    return this.readJson(AIProviderSchema, `/providers/${id}.json`);
  }

  async getProviders(): Promise<AIProvider[]> {
    const ids = await this.listFileNames('/providers/');
    const providers = await this.processInChunks(ids, (id) => this.getProvider(id as ProviderId));

    return providers.filter(isTruthy);
  }

  async createProvider(provider: AIProvider): Promise<void> {
    await this.writeJson(`/providers/${provider.id}.json`, provider);
  }

  async updateProvider(id: ProviderId, updates: Partial<AIProviderEditableFields>): Promise<void> {
    const existing = await this.getProvider(id);

    if (!existing) {
      throw new Error(`Provider with id ${id} not found`);
    }

    await this.writeJson(`/providers/${id}.json`, { ...existing, ...updates });
  }

  async deleteProvider(id: ProviderId): Promise<void> {
    await this.removeFile(`/providers/${id}.json`);
  }

  async clear(): Promise<void> {
    throw new Error('Clearing filesystem storage is not implemented');
  }

  private getStoragePath(path: string): string {
    const { user } = Auth.requireContextSession();
    const userRoot = join(this.rootStorage, encodeURIComponent(user.webId));
    const resolved = join(userRoot, path);

    if (!resolved.startsWith(userRoot + '/')) {
      throw new Error('Invalid storage path');
    }

    return resolved;
  }

  private async ensureDir(path: string): Promise<void> {
    await mkdir(path, { recursive: true });
  }

  private async listFileNames(path: string, extension: string = '.json'): Promise<string[]> {
    const storagePath = this.getStoragePath(path);

    if (!existsSync(storagePath)) {
      return [];
    }

    const files = await readdir(storagePath);

    return files.map((file) => basename(file, extension));
  }

  private async removeFile(path: string): Promise<void> {
    await rm(this.getStoragePath(path), { force: true });
  }

  private async readJson<T extends z.ZodTypeAny>(schema: T, path: string): Promise<z.infer<T> | null> {
    const storagePath = this.getStoragePath(path);
    const contents = existsSync(storagePath) && (await readFile(storagePath, 'utf8'));

    if (!contents) {
      return null;
    }

    return await schema.parse(JSON.parse(contents));
  }

  private async writeJson(path: string, value: any): Promise<void> {
    const storagePath = this.getStoragePath(path);

    await this.ensureDir(join(storagePath, '..'));
    await writeFile(storagePath, JSON.stringify(value, null, 2), 'utf8');
  }

  private async processInChunks<TItems, TResult>(
    items: TItems[],
    processor: (item: TItems) => Promise<TResult>,
  ): Promise<TResult[]> {
    const results: TResult[] = [];

    for (let i = 0; i < items.length; i += CHUNK_SIZE) {
      const chunk = items.slice(i, i + CHUNK_SIZE);
      const chunkResults = await Promise.all(chunk.map(processor));
      results.push(...chunkResults);
    }

    return results;
  }
}
