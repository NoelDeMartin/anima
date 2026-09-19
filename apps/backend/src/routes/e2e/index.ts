import { ModelsManager, type ProviderType } from '@anima/core';
import Elysia, { status } from 'elysia';

import Auth from '../../services/Auth';
import SolidServer from '../../services/SolidServer';

export default new Elysia()
  .onBeforeHandle(() => {
    if (process.env.E2E) {
      return;
    }

    throw status(400, 'E2E not enabled in the current environment');
  })
  .post('/reset', async () => {
    Auth.reset();

    if (SolidServer.isEnabled()) {
      await SolidServer.restart();
    }

    await ModelsManager.clear();
    await ModelsManager.createProvider({ type: 'testing' as ProviderType, name: 'Testing' });
  });
