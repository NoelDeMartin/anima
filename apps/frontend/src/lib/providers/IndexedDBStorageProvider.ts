import type {
  AnimaChat,
  AnimaChatEditableFields,
  ModelMetadata,
  ModelName,
  ProviderName,
  StorageProvider,
  AnimaUIMessage,
} from '@anima/core';
import { arraySorted } from '@noeldemartin/utils';
import { generateId } from 'ai';
import { type DBSchema, type IDBPDatabase, openDB } from 'idb';

interface Database extends DBSchema {
  chats: {
    key: string;
    value: AnimaChat;
  };
  messages: {
    key: string;
    value: AnimaUIMessage & { chatId: string };
    indexes: {
      'by-chat': string;
    };
  };
  modelsMetadata: {
    key: [string, string];
    value: ModelMetadata;
  };
}

const DB_NAME = 'anima';
const DB_VERSION = 1;

export default class IndexedDBStorageProvider implements StorageProvider {
  private dbPromise: Promise<IDBPDatabase<Database>>;

  constructor() {
    this.dbPromise = openDB<Database>(DB_NAME, DB_VERSION, {
      upgrade(db, _oldVersion, _newVersion, transaction) {
        if (!db.objectStoreNames.contains('chats')) {
          db.createObjectStore('chats', { keyPath: 'id' });
        }

        if (!db.objectStoreNames.contains('modelsMetadata')) {
          db.createObjectStore('modelsMetadata', { keyPath: ['provider', 'model'] });
        }

        const messageStore = db.objectStoreNames.contains('messages')
          ? transaction.objectStore('messages')
          : db.createObjectStore('messages', { keyPath: 'id' });

        if (!messageStore.indexNames.contains('by-chat')) {
          messageStore.createIndex('by-chat', 'chatId');
        }
      },
    });
  }

  async getChat(id: AnimaChat['id']): Promise<AnimaChat | null> {
    const db = await this.dbPromise;

    return (await db.get('chats', id)) ?? null;
  }

  async getChats(): Promise<AnimaChat[]> {
    const db = await this.dbPromise;

    return db.getAll('chats');
  }

  async getChatMessages(chat: AnimaChat): Promise<AnimaUIMessage[]> {
    const db = await this.dbPromise;
    const messagesWithChatId = await db.getAllFromIndex('messages', 'by-chat', chat.id);

    return arraySorted(
      messagesWithChatId.map(({ chatId: _chatId, ...message }) => message as AnimaUIMessage),
      'metadata.createdAt',
    );
  }

  async getModelMetadata(provider: ProviderName, name: ModelName): Promise<ModelMetadata | null> {
    const db = await this.dbPromise;

    return (await db.get('modelsMetadata', [provider, name])) ?? null;
  }

  async getModelsMetadata(): Promise<ModelMetadata[]> {
    const db = await this.dbPromise;

    return db.getAll('modelsMetadata');
  }

  async createChat(data: AnimaChatEditableFields): Promise<AnimaChat> {
    const now = new Date();
    const db = await this.dbPromise;
    const chat = {
      ...data,
      id: generateId() as AnimaChat['id'],
      createdAt: now,
      updatedAt: now,
    };

    await db.add('chats', chat);

    return chat;
  }

  async updateChat(id: AnimaChat['id'], updates: Partial<AnimaChatEditableFields>): Promise<void> {
    const db = await this.dbPromise;

    const transaction = db.transaction('chats', 'readwrite');
    const chat = await transaction.store.get(id);

    if (!chat) {
      throw new Error('Chat not found');
    }

    await transaction.store.put({ ...chat, ...updates, updatedAt: new Date() });
    await transaction.done;
  }

  async storeChatMessage(chat: AnimaChat, message: AnimaUIMessage): Promise<void> {
    const db = await this.dbPromise;

    await db.put('messages', { ...message, chatId: chat.id });
  }

  async storeModelMetadata(metadata: ModelMetadata): Promise<void> {
    const db = await this.dbPromise;

    await db.put('modelsMetadata', metadata);
  }

  async deleteModelMetadata(provider: ProviderName, name: ModelName): Promise<void> {
    const db = await this.dbPromise;

    await db.delete('modelsMetadata', [provider, name]);
  }
}
