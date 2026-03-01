import type { Chat } from '@ai-sdk/vue';
import type { AIModel, ModelData, ProviderName, ModelName, UIMessage } from '@anima/core';

export default interface Runtime {
  initialize(): Promise<{ models: AIModel[]; providers: ProviderName[] }>;
  createChat(): Chat<UIMessage>;
  sendMessage(chat: Chat<UIMessage>, message: string): Promise<void>;
  getModels(): Promise<AIModel[]>;
  getProviders(): Promise<ProviderName[]>;
  installModel(provider: ProviderName, name: ModelName, data: ModelData): Promise<AIModel>;
  updateModel(provider: ProviderName, name: ModelName, updates: Partial<ModelData>): Promise<void>;
  deleteModel(provider: ProviderName, name: ModelName): Promise<void>;
  cancelModelInstallation(provider: ProviderName, name: ModelName): Promise<void>;
}
