import { AIModelSchema, AIProviderSchema, ModelMetadataEditableFieldsSchema, ModelsManager } from '@anima/core';
import Elysia from 'elysia';
import z from 'zod';

import Auth from '../../services/Auth';

export default new Elysia().group('models', (app) =>
  app
    .get('/', ({ request }) => Auth.runForRequest(request, () => ModelsManager.getModels()), {
      response: z.array(AIModelSchema),
    })
    .get('/providers/', ({ request }) => Auth.runForRequest(request, () => ModelsManager.getProviders()), {
      response: z.array(AIProviderSchema),
    })
    .post(
      '/',
      ({ request, body: { provider, name, ...data } }) =>
        Auth.runForRequest(request, () => ModelsManager.installModel(provider, name, data)),
      {
        body: ModelMetadataEditableFieldsSchema.extend({
          provider: z.string().brand('ProviderName'),
          name: z.string().brand('ModelName'),
        }),
        response: AIModelSchema,
      },
    )
    .patch(
      '/:name',
      ({ request, params: { name }, body: { provider, ...updates } }) =>
        Auth.runForRequest(request, () => ModelsManager.upsertModel(provider, name, updates)),
      {
        params: z.object({ name: z.string().brand('ModelName') }),
        body: ModelMetadataEditableFieldsSchema.partial().extend({ provider: z.string().brand('ProviderName') }),
      },
    )
    .delete(
      '/:name',
      ({ request, params: { name }, body: { provider } }) =>
        Auth.runForRequest(request, () => ModelsManager.deleteModel(provider, name)),
      {
        params: z.object({ name: z.string().brand('ModelName') }),
        body: z.object({ provider: z.string().brand('ProviderName') }),
      },
    )
    .post(
      '/:name/cancel-installation',
      ({ request, params: { name }, body: { provider } }) =>
        Auth.runForRequest(request, () => ModelsManager.cancelModelInstallation(provider, name)),
      {
        params: z.object({ name: z.string().brand('ModelName') }),
        body: z.object({ provider: z.string().brand('ProviderName') }),
      },
    ),
);
