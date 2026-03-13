import { defineSchema } from 'soukai-bis';
import z from 'zod';

export default defineSchema({
  rdfContext: 'https://vocab.noeldemartin.com/ai/',
  rdfClass: 'MessagePart',
  timestamps: false,
  fields: {
    position: z.number(),
    text: z.string().optional(),
    toolCall: z.string().optional(),
  },
});
