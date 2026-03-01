import { defineServiceState } from '@aerogel/core';
import type { AIModel, ModelName, ProviderName } from '@anima/core';

export default defineServiceState({
  name: 'ai',
  persist: ['selectedModelKey'],
  initialState: {
    providers: [] as ProviderName[],
    models: {} as Record<`${ProviderName}-${ModelName}`, AIModel>,
    selectedModelKey: null as `${ProviderName}-${ModelName}` | null,
  },
  computed: {
    modelsList: ({ models }) => Object.values(models),
    selectedModel: ({ models, selectedModelKey }) => (selectedModelKey && models[selectedModelKey]) ?? null,
  },
});
