import { GoogleModelsProvider, ModelsManager, type ProviderName, TestingModelsProvider } from '@anima/core';

import { env } from '../lib/env';
import { OllamaModelsProvider } from './OllamaModelsProvider';

export async function registerProviders() {
  if (env('E2E')) {
    await ModelsManager.registerProvider('testing' as ProviderName, new TestingModelsProvider());

    return;
  }

  await Promise.all([
    ModelsManager.registerProvider('google' as ProviderName, new GoogleModelsProvider()),
    ModelsManager.registerProvider('ollama' as ProviderName, new OllamaModelsProvider()),
  ]);
}
