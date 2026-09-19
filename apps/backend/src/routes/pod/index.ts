import { Elysia, status } from 'elysia';

import SolidServer from '../../services/SolidServer';

export default new Elysia()
  .onBeforeHandle(() => {
    if (SolidServer.isEnabled()) {
      return;
    }

    throw status(404, 'Managed POD is disabled');
  })
  .onRequest(({ request }) => SolidServer.guard(request))
  .all('/', ({ request }) => SolidServer.proxy(request))
  .all('*', ({ request }) => SolidServer.proxy(request));
