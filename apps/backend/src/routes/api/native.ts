import { Elysia } from 'elysia';
import z from 'zod';

import Native, { PickFolderResponseSchema } from '../../services/Native';

export default new Elysia({ prefix: '/native' })
  .get('/', () => ({ available: Native.isAvailable() }), { response: z.object({ available: z.boolean() }) })
  .post('/pick-folder', () => Native.pickFolder(), { response: PickFolderResponseSchema });
