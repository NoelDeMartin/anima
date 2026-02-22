import './lib/soukai-bis';
import { cors } from '@elysiajs/cors';
import { node } from '@elysiajs/node';
import { Elysia } from 'elysia';

import { PORT } from './lib/constants';
import ai from './routes/ai';
import auth from './routes/auth';
import e2e from './routes/e2e';

export type { Model } from './routes/ai';

export const Api = new Elysia({ adapter: node() })
  .use(cors())
  .use(auth)
  .use(ai)
  .use(e2e)
  .listen(PORT, ({ hostname, port }) => {
    console.log(`🟢 Server running at http://${hostname}:${port}`);
  });
