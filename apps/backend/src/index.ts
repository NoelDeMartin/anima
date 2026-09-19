import './lib/soukai-bis';
import { bootAnimaModels } from '@anima/core';
import { cors } from '@elysiajs/cors';
import { node } from '@elysiajs/node';
import { isDevelopment } from '@noeldemartin/utils';
import { Elysia } from 'elysia';
import { bootCoreModels } from 'soukai-bis';

import { PORT } from './lib/constants';
import { registerProviders } from './providers';
import { useRoutes } from './routes';

export type { Api } from './routes';
export type { ApiAnimaChat } from './routes/api/ai/chats';

const app = new Elysia({ adapter: node() }).use(cors());

useRoutes(app);

app
  .onStart(async () => {
    bootCoreModels();
    bootAnimaModels();

    await registerProviders();
  })
  .onError(({ code, error, request }) => {
    if (isDevelopment()) {
      const method = request.method;
      const path = new URL(request.url).pathname;
      const status = 'status' in error && typeof error.status === 'number' ? error.status : 500;
      const errorStack = error instanceof Error ? error.stack : undefined;
      const errorCause =
        error instanceof Error && 'cause' in error ? (error as Error & { cause?: unknown }).cause : undefined;

      console.error(`❌ [${method}] ${path} - ${status} ${code || 'ERROR'}`);
      console.error('Error:', error);

      errorStack && console.error('Stack:', errorStack);
      errorCause && console.error('Cause:', errorCause);
    }
  })
  .listen(PORT, ({ hostname, port }) => {
    console.log(`🟢 Server running at http://${hostname}:${port}`);
  });
