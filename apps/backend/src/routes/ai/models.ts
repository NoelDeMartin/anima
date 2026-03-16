import { AIModelSchema, InstalledModelEditableFieldsSchema, ModelsManager } from '@anima/core';
import Elysia from 'elysia';
import z from 'zod';

import Auth from '../../services/Auth';

export default new Elysia().group('models', (app) =>
  app
    .get('/', ({ request }) => Auth.runForRequest(request, () => ModelsManager.getModels()), {
      response: z.array(AIModelSchema),
    })
    .post(
      '/',
      ({ request, body: { providerId, name, ...data } }) =>
        Auth.runForRequest(request, () => ModelsManager.createModel(providerId, name, data)),
      {
        body: InstalledModelEditableFieldsSchema.extend({
          providerId: z.string().brand('ProviderId'),
          name: z.string(),
        }),
        response: AIModelSchema,
      },
    )
    .patch(
      '/:id',
      ({ request, params: { id }, body }) => Auth.runForRequest(request, () => ModelsManager.updateModel(id, body)),
      {
        params: z.object({ id: z.string().brand('ModelId') }),
        body: InstalledModelEditableFieldsSchema.partial(),
      },
    )
    .delete('/:id', ({ request, params: { id } }) => Auth.runForRequest(request, () => ModelsManager.deleteModel(id)), {
      params: z.object({ id: z.string().brand('ModelId') }),
    })
    .post(
      '/:id/cancel-installation',
      ({ request, params: { id }, body: { providerId } }) =>
        Auth.runForRequest(request, () => ModelsManager.cancelModelInstallation(providerId, id)),
      {
        params: z.object({ id: z.string().brand('ModelId') }),
        body: z.object({ providerId: z.string().brand('ProviderId') }),
      },
    ),
);
