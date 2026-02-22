import { tool } from 'ai';
import { Container, runWithEngine, SolidEngine } from 'soukai-bis';
import z from 'zod';

import Auth from '../services/Auth';

export default tool({
  description: 'Get a list of files in the given container.',
  inputSchema: z.object({ url: z.url().describe('The container url to list the files of.') }),
  outputSchema: z.array(z.string().describe("File url (ending with / in case it's a nested container).")),
  strict: true,
  async execute({ url }) {
    const session = Auth.requireContextSession();

    return runWithEngine(new SolidEngine(session.fetch), async () => {
      const container = await Container.find(url);

      return container?.resourceUrls ?? [];
    });
  },
});
