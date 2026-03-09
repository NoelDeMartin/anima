import type { ModelMetadata, ModelName } from '@anima/core';
import type { Nullable } from '@noeldemartin/utils';
import type { streamText, LanguageModel } from 'ai';
import z from 'zod';

export type ProviderOptions = NonNullable<Parameters<typeof streamText>[0]['providerOptions']>;

export const BaseProviderModelSchema = z.object({
  name: z.string().brand('ModelName'),
});

export const ProviderModelSchema = z.union([
  BaseProviderModelSchema.extend({ status: z.literal('installed') }),
  BaseProviderModelSchema.extend({ status: z.literal('installing'), progress: z.number() }),
]);

export type ProviderModel = z.infer<typeof ProviderModelSchema>;

export interface ModelsProvider {
  isSupported?(): Promise<boolean>;
  initialize?(): Promise<void>;
  getModels(): Promise<ProviderModel[]>;
  installModel(name: ModelName): Promise<ProviderModel>;
  deleteModel(name: ModelName): Promise<void>;
  cancelModelInstallation(name: ModelName): Promise<void>;
  createLanguageModel(
    name: ModelName,
    data: Nullable<ModelMetadata>,
  ): Promise<{ model: LanguageModel; supportsTools: boolean; providerOptions?: ProviderOptions }>;
}
