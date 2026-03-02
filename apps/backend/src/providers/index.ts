import {
  GoogleModelsProvider,
  ModelsManager,
  type ProviderName,
  setAuthProvider,
  TestingModelsProvider,
} from '@anima/core';

import { env } from '../lib/env';
import Auth from '../services/Auth';
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

  setAuthProvider({
    getUser: () => Auth.requireContextSession().user,
    fetch: (input: string, init?: RequestInit) => Auth.requireContextSession().fetch(input, init),
  });
}
