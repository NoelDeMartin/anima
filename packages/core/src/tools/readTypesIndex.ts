import { auth } from '@anima/core';
import { isTruthy } from '@noeldemartin/utils';
import { tool } from 'ai';
import { TypeIndex } from 'soukai-bis';
import z from 'zod';

const TypesIndexSchema = z.array(
  z.object({
    dataType: z.string().describe('The type of data being indexed, expressed as an RDF type.'),
    url: z.string().describe('The location of the data being indexed, expressed as the container url.'),
  }),
);

export default tool({
  description: "Get and index of the user's data, including their locations and types.",
  inputSchema: z.object({}),
  outputSchema: TypesIndexSchema,
  strict: true,
  async execute() {
    const user = auth().getUser();
    const typeIndexes = await Promise.all(
      [
        user.publicTypeIndexUrl && TypeIndex.find(user.publicTypeIndexUrl),
        user.privateTypeIndexUrl && TypeIndex.find(user.privateTypeIndexUrl),
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
  },
});
