import { defineServiceState } from '@aerogel/core';

export default defineServiceState({
  name: 'anima',
  initialState: () => ({
    native: false,
  }),
});
