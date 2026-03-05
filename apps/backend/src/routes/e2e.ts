import { setStorageProvider } from '@anima/core';
import { fail } from '@noeldemartin/utils';
import Elysia from 'elysia';

import InMemoryStorageProvider from '../providers/InMemoryStorageProvider';
import Auth from '../services/Auth';

export default new Elysia().group(
  '__e2e__',
  { beforeHandle: () => process.env.E2E || fail('E2E not enabled in the current environment') },
  (app) =>
    app.post('reset', async () => {
      Auth.reset();
      setStorageProvider(new InMemoryStorageProvider());
    }),
);
