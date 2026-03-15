import type { Api } from '@anima/backend';
import { treaty } from '@elysiajs/eden';
import { objectWithoutEmpty } from '@noeldemartin/utils';

import { getSessionId } from '@/auth/session';
import { requireEnv } from '@/lib/env';

export const api: ReturnType<typeof treaty<typeof Api>> = treaty<typeof Api>(requireEnv('VITE_API_DOMAIN'), {
  headers: () =>
    objectWithoutEmpty({
      'X-Anima-Session-Id': getSessionId(),
    }),
});

export default api;
