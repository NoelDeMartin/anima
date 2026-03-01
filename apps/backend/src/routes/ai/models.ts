import { AIModelSchema, ModelDataSchema, ModelsManager } from '@anima/core';
import Elysia from 'elysia';
import z from 'zod';

export default new Elysia().group('models', (app) =>
  app
    .get('/', () => ModelsManager.getModels(), { response: z.array(AIModelSchema) })
    .get('/providers/', () => ModelsManager.getProviders(), { response: z.array(z.string().brand('ProviderName')) })
    .post('/', ({ body: { provider, name, ...data } }) => ModelsManager.installModel(provider, name, data), {
      body: ModelDataSchema.extend({ provider: z.string().brand('ProviderName'), name: z.string().brand('ModelName') }),
      response: AIModelSchema,
    })
    .patch(
      '/:name',
      ({ params: { name }, body: { provider, ...updates } }) => ModelsManager.updateModel(provider, name, updates),
      {
        params: z.object({ name: z.string().brand('ModelName') }),
        body: ModelDataSchema.partial().extend({ provider: z.string().brand('ProviderName') }),
      },
    )
    .delete('/:name', ({ params: { name }, body: { provider } }) => ModelsManager.deleteModel(provider, name), {
      params: z.object({ name: z.string().brand('ModelName') }),
      body: z.object({ provider: z.string().brand('ProviderName') }),
    })
    .post(
      '/:name/cancel-installation',
      ({ params: { name }, body: { provider } }) => ModelsManager.cancelModelInstallation(provider, name),
      {
        params: z.object({ name: z.string().brand('ModelName') }),
        body: z.object({ provider: z.string().brand('ProviderName') }),
      },
    ),
);
