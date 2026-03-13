import { existsSync } from 'node:fs';
import { mkdir, readFile, readdir, writeFile, rm } from 'node:fs/promises';
import { homedir } from 'node:os';
import { basename, join } from 'node:path';

import {
  ModelMetadataSchema,
  type ModelMetadata,
  type ModelName,
  type ProviderName,
  type ModelsStorageProvider,
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

  async getModelMetadata(provider: ProviderName, name: ModelName): Promise<ModelMetadata | null> {
    const data = await this.readJson(ModelMetadataSchema, `/models/${provider}/${name}.json`);

    return data;
  }

  async getModelsMetadata(): Promise<ModelMetadata[]> {
    const providerFiles = await this.listFileNames(`/models/`);
    const models = await this.processInChunks(providerFiles, async (provider) => {
      const modelFiles = await this.listFileNames(`/models/${provider}`);

      return await this.processInChunks(modelFiles, (model) =>
        this.getModelMetadata(provider as ProviderName, model as ModelName),
      );
    });

    return models.flat().filter(isTruthy);
  }

  async storeModelMetadata(metadata: ModelMetadata): Promise<void> {
    await this.writeJson(`/models/${metadata.provider}/${metadata.name}.json`, metadata);
  }

  async deleteModelMetadata(provider: ProviderName, name: ModelName): Promise<void> {
    await this.removeFile(`/models/${provider}/${name}.json`);
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
