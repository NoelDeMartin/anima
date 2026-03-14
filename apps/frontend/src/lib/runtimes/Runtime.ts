import type { Chat } from '@ai-sdk/vue';
import type {
  AIModel,
  AnimaChat,
  ProviderName,
  ModelName,
  AnimaUIMessage,
  AnimaChatEditableFields,
  ModelMetadataEditableFields,
} from '@anima/core';

export default interface Runtime {
  initialize(): Promise<{ chats: AnimaChat[]; models: AIModel[]; providers: ProviderName[] }>;
  getChats(): Promise<AnimaChat[]>;
  getModels(): Promise<AIModel[]>;
  getProviders(): Promise<ProviderName[]>;
  createAnimaChat(data: AnimaChatEditableFields): Promise<AnimaChat>;
  createAIChat(chat: AnimaChat, options: { loadMessages: boolean }): Promise<Chat<AnimaUIMessage>>;
  updateChat(url: AnimaChat['url'], updates: Partial<AnimaChatEditableFields>): Promise<void>;
  sendMessage(chat: Chat<AnimaUIMessage>, message: string): Promise<void>;
  installModel(provider: ProviderName, name: ModelName, data: ModelMetadataEditableFields): Promise<AIModel>;
  updateModel(provider: ProviderName, name: ModelName, updates: Partial<ModelMetadataEditableFields>): Promise<void>;
  deleteModel(provider: ProviderName, name: ModelName): Promise<void>;
  cancelModelInstallation(provider: ProviderName, name: ModelName): Promise<void>;
}
