import './lib/soukai-bis';
import { cors } from '@elysiajs/cors';
import { Elysia } from 'elysia';

import { PORT } from './lib/constants';
import { registerProviders } from './providers';
import ai from './routes/ai';
import auth from './routes/auth';
import e2e from './routes/e2e';

export type { ApiAnimaChat } from './routes/ai/chats';

export const Api = new Elysia({ serve: { idleTimeout: 255 } })
  .use(cors())
  .use(auth)
  .use(ai)
  .use(e2e)
  .onStart(registerProviders)
  .listen(PORT, ({ hostname, port }) => {
    console.log(`🟢 Server running at http://${hostname}:${port}`);
  });
