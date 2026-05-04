import { Elysia } from 'elysia';
import z from 'zod';

import SolidServer from '../services/SolidServer';

export default new Elysia()
  .onStart(() => SolidServer.start())
  .onRequest(({ request }) => SolidServer.guard(request))
  .post(
    '/signup',
    async ({ set, body: { email, username, password } }) => {
      // TODO validate username not taken

      const idpResponse = await SolidServer.privilegedFetch('/idp/register/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      if (!idpResponse.ok) {
        set.status = idpResponse.status;
        return idpResponse.text();
      }

      const cookie = idpResponse.headers.get('set-cookie') || '';

      const podResponse = await SolidServer.privilegedFetch('/pod/create/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Cookie: cookie,
        },
        body: JSON.stringify({
          name: username,
        }),
      });

      if (!podResponse.ok) {
        set.status = podResponse.status;
        return podResponse.text();
      }

      set.headers['Set-Cookie'] = cookie;
    },
    {
      body: z.object({
        email: z.email(),
        username: z.string(),
        password: z.string(),
      }),
    },
  )
  .all('*', ({ request }) => SolidServer.proxy(request));
