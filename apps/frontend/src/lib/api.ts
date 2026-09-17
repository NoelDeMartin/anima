import { requireEnv } from '@aerogel/core';

import type lazyApi from './api.lazy';

let instance: ReturnType<typeof lazyApi> | null = null;

const api = new Proxy(
  {},
  {
    get(_, prop) {
      if (!instance) {
        throw new Error('API not initialized');
      }

      return Reflect.get(instance, prop);
    },
  },
) as ReturnType<typeof lazyApi>;

export async function initialize(): Promise<void> {
  if (instance) {
    return;
  }

  const { default: lazyApi } = await import('./api.lazy');

  instance = lazyApi(requireEnv('VITE_API_DOMAIN'));
}

export default api;
