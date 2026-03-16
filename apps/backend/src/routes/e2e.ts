import { ModelsManager, type ProviderType } from '@anima/core';
import Elysia, { status } from 'elysia';

import Auth from '../services/Auth';

export default new Elysia().group(
  '__e2e__',
  {
    beforeHandle: () => {
      if (process.env.E2E) {
        return;
      }

      throw status(400, 'E2E not enabled in the current environment');
    },
  },
  (app) =>
    app.post('reset', async () => {
      Auth.reset();

      await ModelsManager.clear();
      await ModelsManager.createProvider({ type: 'testing' as ProviderType, name: 'Testing' });
    }),
);
