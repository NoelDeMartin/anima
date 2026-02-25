import { defineServiceState } from '@aerogel/core';
import type { Model } from '@anima/backend';

export default defineServiceState({
  name: 'ai',
  initialState: {
    models: [] as Model[],
    messages: [] as { author: 'user' | 'model'; content: string }[],
  },
});
