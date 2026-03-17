import { auth } from '@anima/core';
import { tool } from 'ai';
import { Container } from 'soukai-bis';
import z from 'zod';

export default tool({
  description: 'Get a list of files in the given container.',
  inputSchema: z.object({ url: z.string().describe('The container url to list the files of.') }),
  outputSchema: z.array(z.string().describe("File url (ending with / in case it's a nested container).")),
  strict: true,
  async execute({ url }) {
    const user = auth().getUser();
    const isInsideStorage = user.storageUrls.some((storageUrl) => url.startsWith(storageUrl));

    if (!isInsideStorage) {
      throw new Error("Cannot list files outside the user's POD");
    }

    if (!url.endsWith('/')) {
      throw new Error('Container url must end with a slash');
    }

    const container = await Container.find(url);

    return container?.resourceUrls ?? [];
  },
});
