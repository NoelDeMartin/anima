import { Elysia } from 'elysia';
import z from 'zod';

import { SolidServerError } from '../../../lib/errors/SolidServerError';
import Auth from '../../../services/Auth';
import SolidServer, { AuthorizationDetailsSchema } from '../../../services/SolidServer';

const LocationResponseSchema = z.object({ location: z.string() });

export default new Elysia({ prefix: '/authorize' })
  .error({ SolidServerError })
  .onBeforeHandle(() => SolidServer.assertEnabled())
  .onError(({ error }) => SolidServer.handleError(error))
  .get('/', ({ request }) => SolidServer.getAuthorization(request, Auth.managedCredentials(request)), {
    response: AuthorizationDetailsSchema,
  })
  .post(
    '/login',
    async ({ request, set }) => {
      const credentials = Auth.requireManagedCredentials(request);
      const location = await SolidServer.loginAuthorization(request, credentials);

      set.headers['set-cookie'] = SolidServer.podSessionCookie(credentials);

      return { location };
    },
    { response: { 200: LocationResponseSchema, 401: z.string() } },
  )
  .post(
    '/consent',
    async ({ request }) => ({
      location: await SolidServer.consentAuthorization(request, Auth.requireManagedCredentials(request)),
    }),
    { response: { 200: LocationResponseSchema, 401: z.string() } },
  )
  .post(
    '/cancel',
    async ({ request }) => ({
      location: await SolidServer.cancelAuthorization(request, Auth.managedCredentials(request)),
    }),
    { response: LocationResponseSchema },
  );
