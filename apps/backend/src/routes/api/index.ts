import Elysia from 'elysia';

import ai from './ai';
import auth from './auth';
import native from './native';
import solid from './solid';

export default new Elysia().use(auth).use(solid).use(ai).use(native);
