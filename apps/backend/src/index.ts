import { Elysia } from 'elysia';
import { cors } from '@elysiajs/cors';
import { node } from '@elysiajs/node';

import auth from './routes/auth';
import ai from './routes/ai';
import { PORT } from './lib/constants';

export const Api = new Elysia({ adapter: node() })
  .use(cors())
  .use(auth)
  .use(ai)
  .listen(PORT, ({ hostname, port }) => {
    console.log(`🟢 Server running at http://${hostname}:${port}`);
  });
