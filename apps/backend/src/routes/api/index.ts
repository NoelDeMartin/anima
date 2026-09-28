import Elysia from 'elysia';

import ai from './ai';
import auth from './auth';
import native from './native';
import pod from './pod';

export default new Elysia().use(auth).use(pod).use(ai).use(native);
