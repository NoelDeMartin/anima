import { App } from '@aerogel/core';
import type { Api } from '@anima/backend';
import { treaty } from '@elysiajs/eden';
import { objectWithoutEmpty } from '@noeldemartin/utils';

import { env } from '@/lib/env';

export const api: ReturnType<typeof treaty<typeof Api>> = treaty<typeof Api>(env('VITE_API_DOMAIN'), {
  headers: () =>
    objectWithoutEmpty({
      'X-Anima-Session-Id': App.service('$auth')?.sessionId,
    }),
});

export default api;
