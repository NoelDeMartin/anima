import { env } from '@aerogel/core';
import type { Api } from '@anima/backend';
import { treaty } from '@elysiajs/eden';
import { objectWithoutEmpty } from '@noeldemartin/utils';

import { getSessionId } from '@/auth/session';

export default function (): ReturnType<typeof treaty<Api>> {
  return treaty<Api>(`${env('VITE_BACKEND_URL')}/api`, {
    headers: () =>
      objectWithoutEmpty({
        'X-Anima-Session-Id': getSessionId(),
      }),
  });
}
