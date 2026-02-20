import { fail } from '@noeldemartin/utils';
import Elysia from 'elysia';

import AI from '../services/AI';
import Auth from '../services/Auth';
import Ollama from '../services/Ollama';

export default new Elysia().group(
  '__e2e__',
  { beforeHandle: () => process.env.E2E || fail('E2E not enabled in the current environment') },
  (app) =>
    app.post('reset', async () => {
      AI.reset();
      Auth.reset();
      Ollama.reset();
    }),
);
