import {
  GoogleModelsProvider,
  ModelsManager,
  OllamaModelsProvider,
  type ProviderName,
  setAuthProvider,
  setModelsStorageProvider,
  TestingModelsProvider,
} from '@anima/core';

import { env } from '../lib/env';
import FilesystemModelsStorageProvider from './FilesystemModelsStorageProvider';
import InMemoryModelsStorageProvider from './InMemoryModelsStorageProvider';
import SessionAuthProvider from './SessionAuthProvider';

export async function registerProviders() {
  setAuthProvider(new SessionAuthProvider());

  if (env('E2E')) {
    setModelsStorageProvider(new InMemoryModelsStorageProvider());

    await ModelsManager.registerProvider('testing' as ProviderName, new TestingModelsProvider());

    return;
  }

  setModelsStorageProvider(new FilesystemModelsStorageProvider());

  await Promise.all([
    ModelsManager.registerProvider('google' as ProviderName, new GoogleModelsProvider()),
    ModelsManager.registerProvider('ollama' as ProviderName, new OllamaModelsProvider('server')),
  ]);
}
