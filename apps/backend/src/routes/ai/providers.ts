import { AIProviderEditableFieldsSchema, AIProviderFactorySchema, AIProviderSchema, ModelsManager } from '@anima/core';
import Elysia from 'elysia';
import z from 'zod';

import Auth from '../../services/Auth';

export default new Elysia().group('providers', (app) =>
  app
    .get('/', ({ request }) => Auth.runForRequest(request, () => ModelsManager.getProviders()), {
      response: z.array(AIProviderSchema),
    })
    .get('/factories', ({ request }) => Auth.runForRequest(request, () => ModelsManager.getProviderFactories()), {
      response: z.array(AIProviderFactorySchema),
    })
    .post('/', ({ request, body }) => Auth.runForRequest(request, () => ModelsManager.createProvider(body)), {
      body: AIProviderSchema.omit({ id: true }),
      response: AIProviderSchema,
    })
    .patch(
      '/:id',
      ({ request, params: { id }, body }) => Auth.runForRequest(request, () => ModelsManager.updateProvider(id, body)),
      {
        params: z.object({ id: z.string().brand('ProviderId') }),
        body: AIProviderEditableFieldsSchema.partial(),
        response: z.void(),
      },
    )
    .delete(
      '/:id',
      ({ request, params: { id } }) => Auth.runForRequest(request, () => ModelsManager.deleteProvider(id)),
      {
        params: z.object({ id: z.string().brand('ProviderId') }),
        response: z.void(),
      },
    ),
);
