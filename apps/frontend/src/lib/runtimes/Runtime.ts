import type {
  AIModel,
  AnimaChatRecord,
  AIProvider,
  ProviderId,
  ModelId,
  AnimaChatEditableFields,
  InstalledModelEditableFields,
  AIProviderEditableFields,
  AIProviderFactory,
} from '@anima/core';
import { PromisedValue } from '@noeldemartin/utils';

import type AnimaChat from '@/lib/ai/AnimaChat';

export interface RuntimeInitializeResult {
  chats: AnimaChatRecord[];
  models: AIModel[];
  providers: AIProvider[];
  factories: AIProviderFactory[];
}

export default abstract class Runtime {
  public readonly initialized = new PromisedValue<void>();

  async initialize(): Promise<RuntimeInitializeResult> {
    const result = await this.performInitialize();

    this.initialized.resolve();

    return result;
  }

  abstract isNative(): Promise<boolean>;
  abstract getChats(): Promise<AnimaChatRecord[]>;
  abstract getModels(): Promise<AIModel[]>;
  abstract getProviders(): Promise<AIProvider[]>;
  abstract createAnimaChat(data: AnimaChatEditableFields): Promise<AnimaChatRecord>;
  abstract createAIChat(chat: AnimaChatRecord, options: { loadMessages: boolean }): Promise<AnimaChat>;
  abstract updateChat(url: AnimaChatRecord['url'], updates: Partial<AnimaChatEditableFields>): Promise<void>;
  abstract sendMessage(chat: AnimaChat, message: string): Promise<void>;
  abstract installModel(providerId: ProviderId, name: string, data?: InstalledModelEditableFields): Promise<AIModel>;
  abstract updateModel(id: ModelId, updates: Partial<InstalledModelEditableFields>): Promise<void>;
  abstract deleteModel(id: ModelId): Promise<void>;
  abstract cancelModelInstallation(providerId: ProviderId, id: ModelId): Promise<void>;
  abstract createProvider(provider: Omit<AIProvider, 'id'>): Promise<void>;
  abstract updateProvider(id: ProviderId, updates: Partial<AIProviderEditableFields>): Promise<void>;
  abstract deleteProvider(id: ProviderId): Promise<void>;

  protected abstract performInitialize(): Promise<RuntimeInitializeResult>;
}
