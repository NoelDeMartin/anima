import {
  GoogleModelsProvider,
  ModelsManager,
  OllamaModelsProvider,
  type ProviderName,
  setAuthProvider,
  setStorageProvider,
  TestingModelsProvider,
} from '@anima/core';

import { env } from '../lib/env';
import FilesystemStorageProvider from './FilesystemStorageProvider';
import InMemoryStorageProvider from './InMemoryStorageProvider';
import SessionAuthProvider from './SessionAuthProvider';

export async function registerProviders() {
  setAuthProvider(new SessionAuthProvider());

  if (env('E2E')) {
    setStorageProvider(new InMemoryStorageProvider());

    await ModelsManager.registerProvider('testing' as ProviderName, new TestingModelsProvider());

    return;
  }

  setStorageProvider(new FilesystemStorageProvider());

  await Promise.all([
    ModelsManager.registerProvider('google' as ProviderName, new GoogleModelsProvider()),
    ModelsManager.registerProvider('ollama' as ProviderName, new OllamaModelsProvider('server')),
  ]);
}
