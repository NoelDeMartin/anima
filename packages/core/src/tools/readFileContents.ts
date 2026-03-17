import { auth } from '@anima/core';
import { fetchSolidDocument, quadsToJsonLD } from '@noeldemartin/solid-utils';
import { tool } from 'ai';
import z from 'zod';

export default tool({
  description: 'Read the contents of the given file.',
  inputSchema: z.object({ url: z.string().describe('The file url to read the contents of.') }),
  outputSchema: z.any().describe('The contents of the file.'),
  strict: true,
  async execute({ url }) {
    const user = auth().getUser();
    const isInsideStorage = user.storageUrls.some((storageUrl) => url.startsWith(storageUrl));

    if (!isInsideStorage) {
      throw new Error("Cannot read files outside the user's POD");
    }

    const document = await fetchSolidDocument(url, { fetch: auth().fetch });

    return quadsToJsonLD(document.getQuads());
  },
});
