import { defineSchema } from 'soukai-bis';
import { string } from 'zod';

export default defineSchema({
  rdfContext: 'http://www.w3.org/2005/01/wf/flow#',
  rdfClass: 'Chat',
  fields: {
    title: string(),
  },
});
