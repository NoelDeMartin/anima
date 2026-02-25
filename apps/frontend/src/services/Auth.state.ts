import { defineServiceState } from '@aerogel/core';
import type { SolidUserProfile } from '@noeldemartin/solid-utils';

export default defineServiceState({
  name: 'auth',
  persist: ['sessionId'],
  initialState: {
    sessionId: null as string | null,
    user: null as SolidUserProfile | null,
    loading: false,
    error: null as string | null,
  },
});
