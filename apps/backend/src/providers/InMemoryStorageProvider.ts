import type {
  AnimaChat,
  AnimaChatEditableFields,
  ModelMetadata,
  ModelName,
  ProviderName,
  StorageProvider,
  AnimaUIMessage,
} from '@anima/core';
import { generateId } from 'ai';

export default class InMemoryStorageProvider implements StorageProvider {
  private chats: Map<AnimaChat['id'], AnimaChat> = new Map();
  private messages: Map<string, AnimaUIMessage[]> = new Map();
  private modelsMetadata: ModelMetadata[] = [];

  async getChat(id: AnimaChat['id']): Promise<AnimaChat | null> {
    return this.chats.get(id) ?? null;
  }

  async getChats(): Promise<AnimaChat[]> {
    return Array.from(this.chats.values());
  }

  async getChatMessages(chat: AnimaChat): Promise<AnimaUIMessage[]> {
    return this.messages.get(chat.id) ?? [];
  }

  async getModelMetadata(provider: ProviderName, name: ModelName): Promise<ModelMetadata | null> {
    return this.modelsMetadata.find((model) => model.provider === provider && model.name === name) ?? null;
  }

  async getModelsMetadata(): Promise<ModelMetadata[]> {
    return this.modelsMetadata;
  }

  async createChat(data: AnimaChatEditableFields): Promise<AnimaChat> {
    const now = new Date();
    const chat = {
      ...data,
      id: generateId() as AnimaChat['id'],
      createdAt: now,
      updatedAt: now,
    };

    this.chats.set(chat.id, chat);

    return chat;
  }

  async updateChat(id: AnimaChat['id'], updates: Partial<AnimaChatEditableFields>): Promise<void> {
    const chat = this.chats.get(id);

    if (!chat) {
      throw new Error('Chat not found');
    }

    Object.assign(chat, { ...updates, updatedAt: new Date() });
  }

  async storeChatMessage(chat: AnimaChat, message: AnimaUIMessage): Promise<void> {
    const chatMessages = this.messages.get(chat.id) ?? [];

    const existingIndex = chatMessages.findIndex((m) => m.id === message.id);
    if (existingIndex >= 0) {
      chatMessages[existingIndex] = message;
    } else {
      chatMessages.push(message);
    }

    this.messages.set(chat.id, chatMessages);
  }

  async storeModelMetadata(metadata: ModelMetadata): Promise<void> {
    const index = this.modelsMetadata.findIndex(
      (model) => model.provider === metadata.provider && model.name === metadata.name,
    );
    if (index >= 0) {
      this.modelsMetadata[index] = metadata;
    } else {
      this.modelsMetadata.push(metadata);
    }
  }

  async deleteModelMetadata(provider: ProviderName, name: ModelName): Promise<void> {
    this.modelsMetadata = this.modelsMetadata.filter((model) => model.provider !== provider || model.name !== name);
  }
}
