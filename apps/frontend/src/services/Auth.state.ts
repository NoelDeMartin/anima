import { defineServiceState } from '@aerogel/core';
import type { SolidUserProfile } from '@noeldemartin/solid-utils';

export default defineServiceState({
  name: 'auth',
  persist: ['sessionId'],
  initialState: {
    user: null as SolidUserProfile | null,
    sessionId: null as string | null,
    loading: false,
    error: null as string | null,
  },
});
