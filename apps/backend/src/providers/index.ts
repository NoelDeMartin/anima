import {
  AnthropicModelsProviderFactory,
  GoogleModelsProviderFactory,
  ModelsManager,
  OllamaModelsProviderFactory,
  OpenAIModelsProviderFactory,
  OtherModelsProviderFactory,
  setAuthProvider,
  TestingModelsProviderFactory,
  type ProviderType,
} from '@anima/core';

import { env } from '../lib/env';
import FilesystemModelsStorageProvider from './FilesystemModelsStorageProvider';
import InMemoryModelsStorageProvider from './InMemoryModelsStorageProvider';
import SessionAuthProvider from './SessionAuthProvider';

export async function registerProviders() {
  setAuthProvider(new SessionAuthProvider());

  if (env('E2E')) {
    ModelsManager.setStorageProvider(new InMemoryModelsStorageProvider());
    ModelsManager.registerFactory('testing' as ProviderType, new TestingModelsProviderFactory());

    return;
  }

  ModelsManager.setStorageProvider(new FilesystemModelsStorageProvider());
  ModelsManager.registerFactory('ollama' as ProviderType, new OllamaModelsProviderFactory('server'));
  ModelsManager.registerFactory('anthropic' as ProviderType, new AnthropicModelsProviderFactory('server'));
  ModelsManager.registerFactory('google' as ProviderType, new GoogleModelsProviderFactory('server'));
  ModelsManager.registerFactory('openai' as ProviderType, new OpenAIModelsProviderFactory('server'));
  ModelsManager.registerFactory('other' as ProviderType, new OtherModelsProviderFactory());
}
