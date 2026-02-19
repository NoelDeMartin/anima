import { Elysia } from 'elysia';
import { cors } from '@elysiajs/cors';
import { node } from '@elysiajs/node';

import { auth } from './modules/auth';
import { PORT } from './constants';

export const Api = new Elysia({ adapter: node() })
  .use(cors())
  .use(auth)
  .listen(PORT, ({ hostname, port }) => {
    console.log(`🟢 Server running at http://${hostname}:${port}`);
  });
