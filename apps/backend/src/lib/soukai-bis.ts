import 'soukai-bis/patch-zod';
import { AsyncLocalStorage } from 'node:async_hooks';

import type { Engine } from 'soukai-bis';
import { setAsyncContextManager } from 'soukai-bis';

const context = new AsyncLocalStorage<Engine>();

setAsyncContextManager({
  runWithValue: (engine, callback) => context.run(engine, callback),
  getValue: () => context.getStore(),
});
