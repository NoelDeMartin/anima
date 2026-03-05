import {
  GoogleModelsProvider,
  ModelsManager,
  type ProviderName,
  setAuthProvider,
  setStorageProvider,
  TestingModelsProvider,
} from '@anima/core';

import { env } from '../lib/env';
import InMemoryStorageProvider from './InMemoryStorageProvider';
import { OllamaModelsProvider } from './OllamaModelsProvider';
import SessionAuthProvider from './SessionAuthProvider';

export async function registerProviders() {
  setAuthProvider(new SessionAuthProvider());
  setStorageProvider(new InMemoryStorageProvider());

  if (env('E2E')) {
    await ModelsManager.registerProvider('testing' as ProviderName, new TestingModelsProvider());

    return;
  }

  await Promise.all([
    ModelsManager.registerProvider('google' as ProviderName, new GoogleModelsProvider()),
    ModelsManager.registerProvider('ollama' as ProviderName, new OllamaModelsProvider()),
  ]);
}
