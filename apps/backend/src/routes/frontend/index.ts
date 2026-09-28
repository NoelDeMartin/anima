import { join } from 'node:path';

import staticPlugin from '@elysia/static';
import { Elysia, file } from 'elysia';

import { FRONTEND_ASSETS } from '../../lib/constants';

export default new Elysia()
  .use(
    await staticPlugin({
      assets: FRONTEND_ASSETS,
      prefix: '/',
      alwaysStatic: true,
    }),
  )
  .get('*', () => file(join(FRONTEND_ASSETS, 'index.html')));
