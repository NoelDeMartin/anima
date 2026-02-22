import { isTruthy } from '@noeldemartin/utils';
import { tool } from 'ai';
import { runWithEngine, SolidEngine, TypeIndex } from 'soukai-bis';
import z from 'zod';

import Auth from '../services/Auth';

const TypesIndexSchema = z.array(
  z.object({
    dataType: z.string().describe('The type of data being indexed, expressed as an RDF type.'),
    url: z.url().describe('The location of the data being indexed, expressed as the container url.'),
  }),
);

export default tool({
  description: "Get and index of the user's data, including their locations and types.",
  inputSchema: z.object({}),
  outputSchema: TypesIndexSchema,
  strict: true,
  async execute() {
    const session = Auth.requireContextSession();

    return runWithEngine(new SolidEngine(session.fetch), async () => {
      const typeIndexes = await Promise.all(
        [
          session.user?.publicTypeIndexUrl && TypeIndex.find(session.user?.publicTypeIndexUrl),
          session.user?.privateTypeIndexUrl && TypeIndex.find(session.user?.privateTypeIndexUrl),
        ].filter(isTruthy),
      );

      const index: z.input<typeof TypesIndexSchema> = [];

      for (const typeIndex of typeIndexes) {
        for (const registration of typeIndex?.registrations ?? []) {
          if (!registration.instanceContainer) {
            continue;
          }

          for (const forClass of registration.forClass) {
            index.push({
              dataType: forClass.toString(),
              url: registration.instanceContainer,
            });
          }
        }
      }

      return index;
    });
  },
});
