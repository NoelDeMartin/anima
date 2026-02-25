import Elysia from 'elysia';

import Auth from '../../services/Auth';
import chat from './chat';
import models from './models';

export default new Elysia().group('ai', { beforeHandle: ({ request }) => Auth.assertLoggedIn(request) }, (app) =>
  app.use(models).use(chat),
);
