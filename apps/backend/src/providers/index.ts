import {
  AnthropicModelsProvider,
  GoogleModelsProvider,
  ModelsManager,
  OllamaModelsProvider,
  OpenAIModelsProvider,
  OtherModelsProvider,
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

  await ModelsManager.registerProvider('ollama' as ProviderName, new OllamaModelsProvider('server'));
  await ModelsManager.registerProvider('anthropic' as ProviderName, new AnthropicModelsProvider());
  await ModelsManager.registerProvider('google' as ProviderName, new GoogleModelsProvider());
  await ModelsManager.registerProvider('openai' as ProviderName, new OpenAIModelsProvider());
  await ModelsManager.registerProvider('other' as ProviderName, new OtherModelsProvider());
}
