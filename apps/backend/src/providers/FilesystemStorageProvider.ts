import { existsSync } from 'node:fs';
import { mkdir, readFile, readdir, writeFile, rm } from 'node:fs/promises';
import { homedir } from 'node:os';
import { basename, join } from 'node:path';

import {
  AnimaChatSchema,
  MessageMetadataSchema,
  ModelMetadataSchema,
  type AnimaChat,
  type AnimaChatEditableFields,
  type AnimaUIMessage,
  type ModelMetadata,
  type ModelName,
  type ProviderName,
  type StorageProvider,
} from '@anima/core';
import { arraySorted, isTruthy, Semaphore } from '@noeldemartin/utils';
import { generateId } from 'ai';
import { status } from 'elysia';
import z from 'zod';

import Auth from '../services/Auth';

const CHUNK_SIZE = 10;

const FilesystemChatSchema = AnimaChatSchema.extend({
  createdAt: z.number(),
  updatedAt: z.number(),
});

const FilesystemMessageSchema = z.looseObject({
  metadata: MessageMetadataSchema.extend({ createdAt: z.number().optional() }),
});

export default class FilesystemStorageProvider implements StorageProvider {
  private rootStorage: string;
  private semaphore = new Semaphore();

  constructor(root?: string) {
    this.rootStorage = root ?? join(homedir(), '.anima');
  }

  async getChat(id: AnimaChat['id']): Promise<AnimaChat | null> {
    const data = await this.readJson(FilesystemChatSchema, `/chats/${id}/chat.json`);

    if (!data) {
      return null;
    }

    return {
      ...data,
      createdAt: new Date(data.createdAt),
      updatedAt: new Date(data.updatedAt),
    };
  }

  async getChats(): Promise<AnimaChat[]> {
    const files = await this.listFileNames(`/chats/`);
    const chats = await this.processInChunks(files, (chatId) => this.getChat(chatId as AnimaChat['id']));

    return chats.filter(isTruthy);
  }

  async getChatMessages(chat: AnimaChat): Promise<AnimaUIMessage[]> {
    const files = await this.listFileNames(`/chats/${chat.id}/messages/`);
    const messages = await this.processInChunks(files, async (messageId) => {
      const data = await this.readJson(FilesystemMessageSchema, `/chats/${chat.id}/messages/${messageId}.json`);

      if (!data) {
        return null;
      }

      return {
        ...data,
        metadata: {
          ...data.metadata,
          createdAt: data.metadata?.createdAt && new Date(data.metadata.createdAt),
        },
      };
    });

    return arraySorted(messages.filter(isTruthy) as AnimaUIMessage[], 'metadata.createdAt');
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

  async createChat(data: AnimaChatEditableFields): Promise<AnimaChat> {
    const now = new Date();
    const chat = {
      ...data,
      id: generateId() as AnimaChat['id'],
      createdAt: now,
      updatedAt: now,
    };

    await this.writeJson(`/chats/${chat.id}/chat.json`, {
      ...chat,
      createdAt: now.getTime(),
      updatedAt: now.getTime(),
    });

    return chat;
  }

  updateChat(id: AnimaChat['id'], updates: Partial<AnimaChatEditableFields>): Promise<void> {
    return this.semaphore.run(async () => {
      const existing = await this.getChat(id);

      if (!existing) {
        throw status(404, 'Chat not found');
      }

      await this.writeJson(`/chats/${id}/chat.json`, {
        ...existing,
        ...updates,
        createdAt: existing.createdAt.getTime(),
        updatedAt: Date.now(),
      });
    });
  }

  async storeChatMessage(chat: AnimaChat, message: AnimaUIMessage): Promise<void> {
    await this.writeJson(`/chats/${chat.id}/messages/${message.id}.json`, {
      ...message,
      metadata: {
        ...message.metadata,
        createdAt: message.metadata?.createdAt?.getTime(),
      },
    });
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
