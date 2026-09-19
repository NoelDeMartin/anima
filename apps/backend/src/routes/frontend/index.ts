import { join } from 'node:path';

import staticPlugin from '@elysia/static';
import { Elysia, file } from 'elysia';

const assets = join(import.meta.dirname, 'public');

export default new Elysia()
  .use(
    staticPlugin({
      assets,
      prefix: '/',
      alwaysStatic: true,
    }),
  )
  .get('*', () => file(join(assets, 'index.html')));
