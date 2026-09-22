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
import { PromisedValue } from '@noeldemartin/utils';

export interface RuntimeInitializeResult {
  chats: AnimaChat[];
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
  abstract getChats(): Promise<AnimaChat[]>;
  abstract getModels(): Promise<AIModel[]>;
  abstract getProviders(): Promise<AIProvider[]>;
  abstract createAnimaChat(data: AnimaChatEditableFields): Promise<AnimaChat>;
  abstract createAIChat(chat: AnimaChat, options: { loadMessages: boolean }): Promise<Chat<AnimaUIMessage>>;
  abstract updateChat(url: AnimaChat['url'], updates: Partial<AnimaChatEditableFields>): Promise<void>;
  abstract sendMessage(chat: Chat<AnimaUIMessage>, message: string): Promise<void>;
  abstract installModel(providerId: ProviderId, name: string, data?: InstalledModelEditableFields): Promise<AIModel>;
  abstract updateModel(id: ModelId, updates: Partial<InstalledModelEditableFields>): Promise<void>;
  abstract deleteModel(id: ModelId): Promise<void>;
  abstract cancelModelInstallation(providerId: ProviderId, id: ModelId): Promise<void>;
  abstract createProvider(provider: Omit<AIProvider, 'id'>): Promise<void>;
  abstract updateProvider(id: ProviderId, updates: Partial<AIProviderEditableFields>): Promise<void>;
  abstract deleteProvider(id: ProviderId): Promise<void>;

  protected abstract performInitialize(): Promise<RuntimeInitializeResult>;
}
