import { Elysia } from 'elysia';

import SolidServer from '../../../services/SolidServer';
import authorize from './authorize';

export default new Elysia({ prefix: '/pod' })
  .onStart(() => SolidServer.isEnabled() && SolidServer.start())
  .use(authorize);
