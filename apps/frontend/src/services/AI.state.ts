import { defineServiceState } from '@aerogel/core';
import type { Model } from '@anima/backend';

export default defineServiceState({
  name: 'ai',
  persist: ['selectedModel'],
  initialState: {
    selectedModel: null as string | null,
    models: {} as Record<string, Model>,
  },
  computed: {
    modelsList: ({ models }) => Object.values(models),
  },
});
