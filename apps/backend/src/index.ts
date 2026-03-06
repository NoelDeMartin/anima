import './lib/soukai-bis';
import { cors } from '@elysiajs/cors';
import { isDevelopment } from '@noeldemartin/utils';
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
  .onError(({ code, error, request }) => {
    if (isDevelopment()) {
      const method = request.method;
      const path = new URL(request.url).pathname;
      const status = 'status' in error && typeof error.status === 'number' ? error.status : 500;
      const errorMessage = error instanceof Error ? error.message : String(error);
      const errorStack = error instanceof Error ? error.stack : undefined;
      const errorCause =
        error instanceof Error && 'cause' in error ? (error as Error & { cause?: unknown }).cause : undefined;

      console.error(`❌ [${method}] ${path} - ${status} ${code || 'ERROR'}`);
      console.error('Error:', errorMessage);

      errorStack && console.error('Stack:', errorStack);
      errorCause && console.error('Cause:', errorCause);
    }

    return error;
  })
  .listen(PORT, ({ hostname, port }) => {
    console.log(`🟢 Server running at http://${hostname}:${port}`);
  });
