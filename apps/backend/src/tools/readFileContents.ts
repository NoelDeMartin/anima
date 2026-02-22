import { fetchSolidDocument, quadsToJsonLD } from '@noeldemartin/solid-utils';
import { tool } from 'ai';
import { runWithEngine, SolidEngine } from 'soukai-bis';
import z from 'zod';

import Auth from '../services/Auth';

export default tool({
  description: 'Read the contents of the given file.',
  inputSchema: z.object({ url: z.url().describe('The file url to read the contents of.') }),
  outputSchema: z.any().describe('The contents of the file.'),
  strict: true,
  async execute({ url }) {
    const session = Auth.requireContextSession();

    return runWithEngine(new SolidEngine(session.fetch), async () => {
      const document = await fetchSolidDocument(url, { fetch: session.fetch });

      return quadsToJsonLD(document.getQuads());
    });
  },
});
