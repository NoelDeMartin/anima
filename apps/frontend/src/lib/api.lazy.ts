import type { Api } from '@anima/backend';
import { treaty } from '@elysiajs/eden';
import { objectWithoutEmpty } from '@noeldemartin/utils';

import { getSessionId } from '@/auth/session';

export default function (apiDomain: string): ReturnType<typeof treaty<typeof Api>> {
  return treaty<typeof Api>(apiDomain, {
    headers: () =>
      objectWithoutEmpty({
        'X-Anima-Session-Id': getSessionId(),
      }),
  });
}
