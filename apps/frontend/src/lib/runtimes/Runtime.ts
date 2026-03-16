import type { Chat } from '@ai-sdk/vue';
import type {
  AIModel,
  AnimaChat,
  AIProvider,
  ProviderId,
  ModelId,
  AnimaUIMessage,
  AnimaChatEditableFields,
  InstalledModelEditableFields,
  AIProviderEditableFields,
  AIProviderFactory,
} from '@anima/core';

export default interface Runtime {
  initialize(): Promise<{
    chats: AnimaChat[];
    models: AIModel[];
    providers: AIProvider[];
    factories: AIProviderFactory[];
  }>;
  getChats(): Promise<AnimaChat[]>;
  getModels(): Promise<AIModel[]>;
  getProviders(): Promise<AIProvider[]>;
  createAnimaChat(data: AnimaChatEditableFields): Promise<AnimaChat>;
  createAIChat(chat: AnimaChat, options: { loadMessages: boolean }): Promise<Chat<AnimaUIMessage>>;
  updateChat(url: AnimaChat['url'], updates: Partial<AnimaChatEditableFields>): Promise<void>;
  sendMessage(chat: Chat<AnimaUIMessage>, message: string): Promise<void>;
  installModel(providerId: ProviderId, name: string, data?: InstalledModelEditableFields): Promise<AIModel>;
  updateModel(id: ModelId, updates: Partial<InstalledModelEditableFields>): Promise<void>;
  deleteModel(id: ModelId): Promise<void>;
  cancelModelInstallation(providerId: ProviderId, id: ModelId): Promise<void>;
  createProvider(provider: Omit<AIProvider, 'id'>): Promise<void>;
  updateProvider(id: ProviderId, updates: Partial<AIProviderEditableFields>): Promise<void>;
  deleteProvider(id: ProviderId): Promise<void>;
}
