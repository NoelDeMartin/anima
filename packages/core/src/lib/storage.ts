import z from 'zod';

export const AIProviderSchema = z.object({
  id: z.string().brand('ProviderId'),
  name: z.string(),
  type: z.string().brand('ProviderType'),
  apiKey: z.string().nullable().optional(),
  url: z.string().nullable().optional(),
});

export const InstalledModelSchema = z.object({
  id: z.string().brand('ModelId'),
  providerId: z.string().brand('ProviderId'),
  name: z.string(),
  enabled: z.boolean(),
  supportsTools: z.boolean(),
  alias: z.string().nullable().optional(),
});

export const AIProviderEditableFieldsSchema = AIProviderSchema.pick({ name: true, apiKey: true, url: true });
export const InstalledModelEditableFieldsSchema = InstalledModelSchema.pick({ enabled: true, alias: true });

export type AIProvider = z.infer<typeof AIProviderSchema>;
export type AIProviderEditableFields = z.infer<typeof AIProviderEditableFieldsSchema>;
export type InstalledModel = z.infer<typeof InstalledModelSchema>;
export type InstalledModelEditableFields = z.infer<typeof InstalledModelEditableFieldsSchema>;
export type ProviderId = AIProvider['id'];
export type ProviderType = AIProvider['type'];
export type ModelId = InstalledModel['id'];

export interface ModelsStorageProvider {
  getProvider(id: ProviderId): Promise<AIProvider | null>;
  getProviders(): Promise<AIProvider[]>;
  createProvider(provider: AIProvider): Promise<void>;
  updateProvider(id: ProviderId, updates: Partial<AIProviderEditableFields>): Promise<void>;
  deleteProvider(id: ProviderId): Promise<void>;
  getModel(id: ModelId): Promise<InstalledModel | null>;
  getModels(): Promise<InstalledModel[]>;
  createModel(model: InstalledModel): Promise<void>;
  updateModel(id: ModelId, updates: Partial<InstalledModelEditableFields>): Promise<void>;
  deleteModel(id: ModelId): Promise<void>;
  clear(): Promise<void>;
}
