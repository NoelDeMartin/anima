import type { streamText, LanguageModel } from 'ai';
import z from 'zod';

import type { AIProvider, ModelId } from './storage';

export const InstallingModelSchema = z.object({
  id: z.string().brand('ModelId'),
  providerId: z.string().brand('ProviderId'),
  name: z.string(),
  progress: z.number(),
});

export type ProviderOptions = NonNullable<Parameters<typeof streamText>[0]['providerOptions']>;
export type InstallingModel = z.infer<typeof InstallingModelSchema>;

export interface ModelsProviderFactory {
  isSupported?(): Promise<boolean>;
  requiresAPIKey?(): Promise<boolean>;
  requiresUrl?(): Promise<boolean>;
  getDefaultConfig?(): Promise<{ url?: string; apiKey?: string }>;
  getAvailableModels?(): Promise<string[]>;
  getInstallingModels(provider: AIProvider): Promise<InstallingModel[]>;
  getPreinstalledModels?(provider: AIProvider): Promise<string[]>;
  createLanguageModel(
    provider: AIProvider,
    name: string,
  ): Promise<{ languageModel: LanguageModel; supportsTools: boolean; providerOptions?: ProviderOptions }>;
  installModel(
    provider: AIProvider,
    id: ModelId,
    name: string,
    options: { onInstalled: () => Promise<void> },
  ): Promise<InstallingModel>;
  cancelModelInstallation(provider: AIProvider, id: ModelId): Promise<void>;
  uninstallModel(provider: AIProvider, name: string): Promise<void>;
}
