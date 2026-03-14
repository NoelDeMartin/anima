import { fail } from '@noeldemartin/utils';
import z from 'zod';

let modelsStorageProvider: ModelsStorageProvider | null = null;

export const ModelMetadataSchema = z.object({
  provider: z.string().brand('ProviderName'),
  name: z.string().brand('ModelName'),
  enabled: z.boolean(),
  alias: z.string().nullable().optional(),
  apiKey: z.string().nullable().optional(),
});

export const ModelMetadataEditableFieldsSchema = ModelMetadataSchema.pick({ enabled: true, alias: true, apiKey: true });

export type ModelMetadata = z.infer<typeof ModelMetadataSchema>;
export type ModelMetadataEditableFields = z.infer<typeof ModelMetadataEditableFieldsSchema>;
export type ProviderName = ModelMetadata['provider'];
export type ModelName = ModelMetadata['name'];

export interface ModelsStorageProvider {
  getModelMetadata(provider: ProviderName, name: ModelName): Promise<ModelMetadata | null>;
  getModelsMetadata(): Promise<ModelMetadata[]>;
  storeModelMetadata(metadata: ModelMetadata): Promise<void>;
  deleteModelMetadata(provider: ProviderName, name: ModelName): Promise<void>;
  clear(): Promise<void>;
}

export function setModelsStorageProvider(provider: ModelsStorageProvider): void {
  modelsStorageProvider = provider;
}

export function modelsStorage(): ModelsStorageProvider {
  return modelsStorageProvider ?? fail('Models storage provider missing');
}
