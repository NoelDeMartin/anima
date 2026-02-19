import { cors } from '@elysiajs/cors';
import { node } from '@elysiajs/node';
import { Elysia } from 'elysia';

import { PORT } from './lib/constants';
import ai from './routes/ai';
import auth from './routes/auth';

export const Api = new Elysia({ adapter: node() })
  .use(cors())
  .use(auth)
  .use(ai)
  .listen(PORT, ({ hostname, port }) => {
    console.log(`🟢 Server running at http://${hostname}:${port}`);
  });
