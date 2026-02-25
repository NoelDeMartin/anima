import Elysia from 'elysia';
import z from 'zod';

import AI, { CreateModelSchema, ModelSchema, UpdateModelSchema } from '../../services/AI';

export default new Elysia().group('models', (app) =>
  app
    .get('/', () => AI.getModels(), { response: z.array(ModelSchema) })
    .post('/', ({ body }) => AI.createModel(body), { body: CreateModelSchema, response: ModelSchema })
    .patch('/:name', ({ params: { name }, body }) => AI.updateModel(name, body), { body: UpdateModelSchema })
    .post('/:name/cancel-installation', ({ params: { name } }) => AI.cancelModelInstallation(name))
    .delete('/:name', ({ params: { name } }) => AI.deleteModel(name)),
);
