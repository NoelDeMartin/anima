import { fail } from '@noeldemartin/utils';
import z from 'zod';

import type { UIMessage } from '../contracts';

let storageProvider: StorageProvider | null = null;

export const AnimaChatSchema = z.object({
  id: z.string().brand('AnimaChatId'),
  title: z.string(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export const AnimaChatEditableFieldsSchema = AnimaChatSchema.pick({ title: true });

export const ModelMetadataSchema = z.object({
  provider: z.string().brand('ProviderName'),
  name: z.string().brand('ModelName'),
  enabled: z.boolean(),
  alias: z.string().nullable().optional(),
  apiKey: z.string().nullable().optional(),
});

export const ModelMetadataEditableFieldsSchema = ModelMetadataSchema.pick({ enabled: true, alias: true, apiKey: true });

export type AnimaChat = z.infer<typeof AnimaChatSchema>;
export type AnimaChatEditableFields = z.infer<typeof AnimaChatEditableFieldsSchema>;
export type ModelMetadata = z.infer<typeof ModelMetadataSchema>;
export type ModelMetadataEditableFields = z.infer<typeof ModelMetadataEditableFieldsSchema>;
export type ProviderName = ModelMetadata['provider'];
export type ModelName = ModelMetadata['name'];

export interface StorageProvider {
  getChat(id: AnimaChat['id']): Promise<AnimaChat | null>;
  getChats(): Promise<AnimaChat[]>;
  getChatMessages(chat: AnimaChat): Promise<UIMessage[]>;
  getModelMetadata(provider: ProviderName, name: ModelName): Promise<ModelMetadata | null>;
  getModelsMetadata(): Promise<ModelMetadata[]>;
  createChat(data: AnimaChatEditableFields): Promise<AnimaChat>;
  updateChat(id: AnimaChat['id'], updates: AnimaChatEditableFields): Promise<void>;
  storeChatMessage(chat: AnimaChat, message: UIMessage): Promise<void>;
  storeModelMetadata(metadata: ModelMetadata): Promise<void>;
  deleteModelMetadata(provider: ProviderName, name: ModelName): Promise<void>;
}

export function setStorageProvider(provider: StorageProvider): void {
  storageProvider = provider;
}

export function storage(): StorageProvider {
  return storageProvider ?? fail('Storage provider missing');
}
