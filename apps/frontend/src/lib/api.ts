import { treaty } from '@elysiajs/eden';
import { objectWithoutEmpty } from '@noeldemartin/utils';
import type { Api } from '@anima/backend';

import { env } from '@/lib/env';
import { services } from '@/services';

export const api: ReturnType<typeof treaty<typeof Api>> = treaty<typeof Api>(env('VITE_API_DOMAIN'), {
  headers: () =>
    objectWithoutEmpty({
      'X-Anima-Session-Id': services.$auth.sessionId,
    }),
});

export default api;
