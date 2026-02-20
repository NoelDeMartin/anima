import Elysia, { status } from 'elysia';
import z from 'zod';

import AI from '../services/AI';
import Auth from '../services/Auth';

export const ModelSchema = z.union([
  z.object({ name: z.string(), status: z.literal('installed') }),
  z.object({ name: z.string(), status: z.literal('installing'), progress: z.number() }),
]);

export type Model = z.infer<typeof ModelSchema>;

export default new Elysia().group('ai', { beforeHandle: ({ request }) => Auth.assertLoggedIn(request) }, (app) =>
  app
    .get(
      'models',
      async () => {
        const installedModels = await AI.getInstalledModels();
        const ongoingInstalls = AI.getOngoingInstalls();

        return ([] as z.input<typeof ModelSchema>[])
          .concat(installedModels.map((model) => ({ name: model, status: 'installed' })))
          .concat(
            Object.entries(ongoingInstalls).map(([model, { progress }]) => ({
              name: model,
              status: 'installing',
              progress,
            })),
          );
      },
      { response: z.array(ModelSchema) },
    )
    .post('models', ({ body: { name } }) => AI.installModel(name), { body: z.object({ name: z.string() }) })
    .patch(
      'models/:name',
      async ({ request, params: { name } }) => {
        const installedModels = await AI.getInstalledModels();

        if (!installedModels.includes(name)) {
          throw status(404, 'Not found');
        }

        await Auth.update(request, { model: name });
      },
      { body: z.object({ selected: z.literal(true) }) },
    )
    .post('models/:name/cancel-installation', ({ params: { name } }) => AI.cancelInstallation(name))
    .post(
      'prompt',
      async ({ request, body: { message } }) => {
        const session = await Auth.requireSession(request);

        return AI.prompt(session, message);
      },
      {
        body: z.object({ message: z.string() }),
        response: z.string(),
      },
    ),
);
