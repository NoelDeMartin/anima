import type { Chat } from '@ai-sdk/vue';
import type {
  AIModel,
  AnimaChat,
  ProviderName,
  ModelName,
  UIMessage,
  AnimaChatEditableFields,
  ModelMetadataEditableFields,
} from '@anima/core';

export default interface Runtime {
  initialize(): Promise<{ chats: AnimaChat[]; models: AIModel[]; providers: ProviderName[] }>;
  getChats(): Promise<AnimaChat[]>;
  getModels(): Promise<AIModel[]>;
  getProviders(): Promise<ProviderName[]>;
  createChat(data: AnimaChatEditableFields): Promise<AnimaChat>;
  restoreChat(chat: AnimaChat): Promise<Chat<UIMessage>>;
  updateChat(id: AnimaChat['id'], updates: AnimaChatEditableFields): Promise<void>;
  sendMessage(chat: Chat<UIMessage>, message: string): Promise<void>;
  installModel(provider: ProviderName, name: ModelName, data: ModelMetadataEditableFields): Promise<AIModel>;
  updateModel(provider: ProviderName, name: ModelName, updates: Partial<ModelMetadataEditableFields>): Promise<void>;
  deleteModel(provider: ProviderName, name: ModelName): Promise<void>;
  cancelModelInstallation(provider: ProviderName, name: ModelName): Promise<void>;
}
