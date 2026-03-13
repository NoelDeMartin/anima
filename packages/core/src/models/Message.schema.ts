import { belongsToMany, defineSchema } from 'soukai-bis';
import z from 'zod';

import MessagePart from './MessagePart';

export default defineSchema({
  rdfContexts: {
    default: 'http://www.w3.org/2005/01/wf/flow#',
    sioc: 'http://rdfs.org/sioc/ns#',
    purl: 'http://purl.org/dc/terms/',
    foaf: 'http://xmlns.com/foaf/0.1/',
    ai: 'https://vocab.noeldemartin.com/ai/',
  },
  rdfClass: 'Message',
  timestamps: false,
  fields: {
    author: z.url().rdfProperty('foaf:maker'),
    partUrls: z.array(z.url()).rdfProperty('ai:part').default([]),
    model: z.string().rdfProperty('ai:model').optional(),
    provider: z.string().rdfProperty('ai:provider').optional(),
    createdAt: z.date().rdfProperty('purl:created').optional(),
  },
  relations: {
    parts: belongsToMany(MessagePart, 'partUrls').usingSameDocument(),
  },
});
