import { defineServiceState } from '@aerogel/core';

export default defineServiceState({
  name: 'ai',
  initialState: {
    messages: [] as { author: 'You' | 'AI'; content: string }[],
  },
});
